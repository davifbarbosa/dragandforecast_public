class ForecastRowsController < BaseController
  before_action :check_uploaded_file, only: %i[ create ]
  def index
    #common
    forecast_rows = current_user.forecast_rows

    forecast_row_backups = current_user.forecast_row_backups
    actuals = current_user.actuals
    if params[:product].present? && params[:product] != "Total"
      forecast_rows = forecast_rows.where("data ->> 'Product' = ?", params[:product])
      @forecast_rows = clean_forecastrow(forecast_rows)
      @forecast_rows_backup = forecast_row_backups.where("data ->> 'Product' = ?", params[:product])
    else
      @forecast_rows = clean_forecastrow(forecast_rows)
      @forecast_rows_backup = forecast_row_backups.all.order(:id)
    end
    #Common totals
    @product_names = ["Total"] + forecast_rows.all.map { |row| row.data["Product"] }.uniq
    @subcategories = ["Total"] + forecast_rows.all.map { |row| row.data["Sub-Category"] }.uniq
    @categories = ["Total"] + forecast_rows.all.map { |row| row.data["Category"] }.uniq

    #Common Avg filters
    if forecast_rows.present?
      avg_keys = forecast_rows.first.data.keys
      @avg = avg_keys.reject { |key| ["Product", "Category", "Sub-Category"].include?(key) }
    end

    @forecast_rows_backup_header = @forecast_rows_backup.map(&:data).flat_map(&:keys).uniq
    @forecast_rows_header = @forecast_rows_backup_header

    @totals_by_year = Hash.new(0) # default value 0
    @totals_by_column = Hash.new(0)   # e.g., "Jan 2024" => 5000.0
    clean_forecast_rows = clean_forecastrow(forecast_rows)
    clean_forecast_rows.each do |forecast|
      forecast[:data].each do |key, value|
        numeric_value = value.to_f
        # Sum by column
        @totals_by_column[key] += numeric_value
        # Sum by year (only if year present in key)
        if key =~ /\b\d{4}\b/
          year = key[/\d{4}/]
          @totals_by_year[year] += numeric_value
        end
      end
    end
    # Handle Avg1
    if params[:avg1_filter_applied] == "true"
      if params[:avg1_selected_dates].present?
        keys = params[:avg1_selected_dates]
        totals_hash = @totals_by_column.to_h
        matching_values = keys.map { |key| totals_hash[key] }
        @average1 = matching_values.sum / matching_values.size
      else
        @average1 = nil # user unchecked all -> no line
      end
    else
      if @totals_by_column.present?
        first_three_values = @totals_by_column.values.first(3)
        @average1 = first_three_values.sum / first_three_values.size
      end
    end

    # Handle Avg2
    if params[:avg2_filter_applied] == "true"
      if params[:avg2_selected_dates].present?
        keys = params[:avg2_selected_dates]
        totals_hash = @totals_by_column.to_h
        matching_values = keys.map { |key| totals_hash[key] }
        @average2 = matching_values.sum / matching_values.size
      else
        @average2 = nil # user unchecked all -> no line
      end
    else
      if @totals_by_column.present?
        first_six_values = @totals_by_column.values.first(6)
        @average2 = first_six_values.sum / first_six_values.size
      end
    end

    @totals_by_year
    @totals_backup_by_column = Hash.new(0)   # e.g., "Jan 2024" => 5000.0
    clean_forecast_row_backups = clean_forecastrow_backups(forecast_row_backups)
    clean_forecast_row_backups.each do |forecast|
      forecast[:data].each do |key, value|
        numeric_value = value.to_f
        # Sum by column
        @totals_backup_by_column[key] += numeric_value
      end
    end


    @actual_columns = Hash.new(0)   # e.g., "Jan 2024" => 5000.0
    clean_actuals = clean_actual_columns(actuals)
    clean_actuals.each do |forecast|
      forecast[:data].each do |key, value|
        numeric_value = value.to_f
        # Sum by column
        @actual_columns[key] += numeric_value
      end
    end

    table_difference
  end

  def create
    forecast_rows = current_user.forecast_rows
    if forecast_rows.present?
      redirect_to forecast_rows_path, alert: 'Please clear Forecast Database first.'
      return
    end
    if params[:file]
      CsvImportService.import(params[:file], current_user)
      redirect_to forecast_rows_path, notice: 'Forecast file successfully uploaded.'
    else
      redirect_to forecast_rows_path, alert: 'Please upload a CSV file.'
    end
  end

  def update
    row = current_user.forecast_rows.find(params[:id])
    if params[:changed_key].present?
      changed_key = params[:changed_key]
      real_value = row[:data][changed_key]&.to_f
      percent_change = params[:percent_change]
      changed_value = real_value.to_f * (percent_change.to_f / 100.0)
      remain_value = real_value + changed_value
      row[:data][changed_key] = remain_value.to_i
      row.save!
      render json: { status: 'updated' }
    end
  end

  def destroy_all
    current_user.forecast_rows.destroy_all
    current_user.forecast_row_backups.destroy_all
    redirect_to forecast_rows_path, notice: 'Forecast Database clear.'
  end

  # app/controllers/forecast_rows_controller.rb
  def table_difference
    @forecast_rows = ForecastRow.includes(:forecast_row_backup)

    @comparison_data = []

    @all_keys = []

    @forecast_rows.each do |row|
      backup = row.forecast_row_backup
      next unless backup

      current_data = row.data
      backup_data = backup.data

      keys = (current_data.keys + backup_data.keys).uniq.sort
      @all_keys |= keys

      differences = keys.map do |key|
        original = backup_data[key]
        updated = current_data[key]

        if is_numeric?(original) && is_numeric?(updated)
          (updated.to_f - original.to_f).round(2)
        else
          original.to_s == updated.to_s ? 0 : 'changed'
        end
      end

      @comparison_data << {
        row_id: row.id,
        values: differences
      }
    end

    @all_keys.sort!
  end

  private
  def check_uploaded_file
    uploaded_file = params[:file]

    if uploaded_file.content_type != 'text/csv'
      redirect_to forecast_rows_path, alert: 'Please upload a valid CSV file'
      return
    end

    row_count = 0
    CSV.foreach(uploaded_file.path) { row_count += 1 }
    row_limit = current_user.subscription_plan.row_limit
    if row_count > row_limit
      redirect_to forecast_rows_path, alert: 'Please upgrade your plan'
      return
    end
  end

  def is_numeric?(value)
    true if Float(value) rescue false
  end

  def clean_forecastrow(forecast_rows)
    forecasts = forecast_rows.map do |forecast|
      filtered_data = forecast.data.reject { |key, _| ["Product", "Category", "Sub-Category"].include?(key) }

      # You can return a hash with filtered data and any other attributes you want:
      {
        id: forecast.id,
        data: filtered_data,
        user_id: forecast.user_id,
        created_at: forecast.created_at,
        updated_at: forecast.updated_at
      }

    end
    return forecasts
  end

  def clean_forecastrow_backups(forecast_row_backups)
    forecast_backups = forecast_row_backups.map do |forecast|
      filtered_data = forecast.data.reject { |key, _| ["Product", "Category", "Sub-Category"].include?(key) }
      # You can return a hash with filtered data and any other attributes you want:
      {
        id: forecast.id,
        data: filtered_data,
        user_id: forecast.user_id,
        created_at: forecast.created_at,
        updated_at: forecast.updated_at
      }

    end
    return forecast_backups
  end

  def clean_actual_columns(actuals)
    actuals = actuals.map do |actual|
      filtered_data = actual.data.reject { |key, _| ["Product", "Category", "Sub-Category"].include?(key) }
      # You can return a hash with filtered data and any other attributes you want:
      {
        id: actual.id,
        data: filtered_data,
        user_id: actual.user_id,
        created_at: actual.created_at,
        updated_at: actual.updated_at
      }

    end
    return actuals
  end

  def first_three_months_average(count)
    forecast_rows = ForecastRow.all.order(:id).first(count)

    sum_of_averages = forecast_rows.sum do |row|
      # Extract first 3 keys that look like a date (YYYY-MM)
      months = row.data.values.select { |k| k }
      first_three_months = months.first(3)
      # Get their integer values
      sum_of_first_three = first_three_months.map(&:to_i).sum
      # Compute average
      sum_of_first_three / first_three_months.size.to_f
    end
    sum_of_averages.round(2)
  end

  def six_months_average(count)
    forecast_rows = ForecastRow.all.order(:id).first(count)

    sum_of_averages = forecast_rows.sum do |row|
      # Extract first 3 keys that look like a date (YYYY-MM)
      months = row.data.values.select { |k| k }
      first_three_months = months.first(3)
      # Get their integer values
      sum_of_first_three = first_three_months.map(&:to_i).sum
      # Compute average
      sum_of_first_three / first_three_months.size.to_f
    end
    sum_of_averages.round(2)
  end

end
