
class ForecastRowsController < BaseController
  require 'axlsx'
  before_action :check_uploaded_file, only: %i[ create]
  before_action :db_exist?, only: %i[ create]

  def export
    @forecast_rows = current_user.forecast_rows
    timestamp = Time.now.strftime("%Y-%m-%d_%H-%M-%S")
    filename = "data_export_#{timestamp}.xlsx"
    respond_to do |format|
      format.xlsx {
        response.headers['Content-Disposition'] = "attachment; filename=\"#{filename}\""
      }
    end
  end

  def table_modify
    # debugger
    forecast_rows1 = current_user.forecast_rows
    if params[:data].present? && params[:data][:product].present?
      forest_id = params[:data][:product]
      forecast_rows = forecast_rows1.where(id: forest_id)
      @modify_table_forecast_rows =  forecast_rows
      @modify_forecast_rows_header = forecast_rows1.map(&:data).flat_map(&:keys).uniq
    elsif params[:data].present? && params[:data][:subcategory].present?
      subcategory_name = params[:data][:subcategory]
      forecast_rows = forecast_rows1.where("data ->> 'Sub-Category' = ?", subcategory_name)
      @forecast_rows = clean_forecastrow(forecast_rows)
      @modify_table_forecast_rows =  forecast_rows
      @modify_forecast_rows_header = forecast_rows1.map(&:data).flat_map(&:keys).uniq
    elsif params[:data].present? && params[:data][:category].present?
      category_name = params[:data][:category]
      forecast_rows = forecast_rows1.where("data ->> 'Category' = ?", category_name)
      @forecast_rows = clean_forecastrow(forecast_rows)
      @modify_table_forecast_rows =  forecast_rows
      @modify_forecast_rows_header = forecast_rows1.map(&:data).flat_map(&:keys).uniq
    else
      @modify_table_forecast_rows = forecast_rows1
      @modify_forecast_rows_header = forecast_rows1.map(&:data).flat_map(&:keys).uniq
    end
    render partial: "forecast_rows/modify_table_frame"
  end
  def index
    #common
    forecast_rows1 = current_user.forecast_rows
    forecast_row_backups = current_user.forecast_row_backups
    actuals = current_user.actuals
    if params[:product].present? && params[:product] != "Total"
      forecast_rows = forecast_rows1.where("data ->> 'Product' = ?", params[:product])
      product = forecast_rows.last.id
      @filter_key = { product: product }
      @forecast_rows = clean_forecastrow(forecast_rows)
      @totals_by_column = Hash.new(0)   # e.g., "Jan 2024" => 5000.0
      @totals_filter_years = Hash.new(0)   # e.g., "Jan 2024" => 5000.0
      clean_forecast_rows = clean_forecastrow(forecast_rows)
      clean_forecast_rows.each do |forecast|
        forecast[:data].each do |key, value|
          numeric_value = value.to_f
          # Sum by column filter
          @totals_by_column[key] += numeric_value
          # Sum by year filter
          if key =~ /\b\d{4}\b/
            year = key[/\d{4}/]
            @totals_filter_years[year] += numeric_value
          end
        end
      end
      forecast_id = forecast_rows.last.id
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
    elsif params[:subcategory].present? && params[:subcategory] != "Total"
      forecast_rows = forecast_rows1.where("data ->> 'Sub-Category' = ?", params[:subcategory])
      subcategory_name = params[:subcategory]
      @filter_key = { subcategory: subcategory_name }
      @totals_by_column = Hash.new(0)   # e.g., "Jan 2024" => 5000.0
      @totals_filter_years = Hash.new(0)
      clean_forecast_rows = clean_forecastrow(forecast_rows)
      @forecast_rows = clean_forecast_rows
      clean_forecast_rows.each do |forecast|
        forecast[:data].each do |key, value|
          numeric_value = value.to_f
          # Sum by column
          @totals_by_column[key] += numeric_value
          # Sum by year filter
          if key =~ /\b\d{4}\b/
            year = key[/\d{4}/]
            @totals_filter_years[year] += numeric_value
          end
        end
      end
      forecast_id = forecast_rows.last.id
      # single_row_difference(forecast_id)
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

    elsif params[:category].present? && params[:category] != "Total"
      forecast_rows = forecast_rows1.where("data ->> 'Category' = ?", params[:category])
      category_name = params[:category]
      @filter_key = { category: category_name }
      @totals_by_column = Hash.new(0)   # e.g., "Jan 2024" => 5000.0
      @totals_filter_years = Hash.new(0)
      clean_forecast_rows = clean_forecastrow(forecast_rows)
      @forecast_rows = clean_forecast_rows
      clean_forecast_rows.each do |forecast|
        forecast[:data].each do |key, value|
          numeric_value = value.to_f
          # Sum by column
          @totals_by_column[key] += numeric_value
          # Sum by year filter
          if key =~ /\b\d{4}\b/
            year = key[/\d{4}/]
            @totals_filter_years[year] += numeric_value
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
    else
      @totals_by_column = Hash.new(0)   # e.g., "Jan 2024" => 5000.0
      @totals_filter_years = Hash.new(0)
      clean_forecast_rows = clean_forecastrow(forecast_rows1)
      @forecast_rows = clean_forecast_rows
      clean_forecast_rows.each do |forecast|
        forecast[:data].each do |key, value|
          numeric_value = value.to_f
          # Sum by column
          @totals_by_column[key] += numeric_value
          # Sum by year filter
          if key =~ /\b\d{4}\b/
            year = key[/\d{4}/]
            @totals_filter_years[year] += numeric_value
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
    end
    @totals_by_year = Hash.new(0) # default value 0
    clean_forecast_rows = clean_forecastrow(forecast_rows1)
    clean_forecast_rows.each do |forecast|
      forecast[:data].each do |key, value|
        numeric_value = value.to_f
        if key =~ /\b\d{4}\b/
          year = key[/\d{4}/]
          @totals_by_year[year] += numeric_value
        end
      end
    end

    #Common filters
    @product_names = ["Total"] + forecast_rows1.all.map { |row| row.data["Product"] }.uniq
    @subcategories = ["Total"] + forecast_rows1.all.map { |row| row.data["Sub-Category"] }.uniq
    @categories = ["Total"] + forecast_rows1.all.map { |row| row.data["Category"] }.uniq

    #Common Avg filters
    if forecast_rows1.present?
      avg_keys = forecast_rows1.first.data.keys
      @avg = avg_keys.reject { |key| ["Product", "Category", "Sub-Category"].include?(key) }
    end
  end
  def table_backup
    if params[:data].present? && params[:data][:product].present?
      forest_id = params[:data][:product]
      forecastRow = current_user.forecast_rows.find(forest_id)
      @forecast_rows_backup = forecastRow.forecast_row_backup
      @forecast_rows_backup_header = @forecast_rows_backup.data.keys
      @forecast_rows_backup = [@forecast_rows_backup] unless @forecast_rows_backup.is_a?(Enumerable)
      @forecast_rows_header = @forecast_rows_backup_header
    elsif params[:data].present? && params[:data][:subcategory].present?
      subcategory_name = params[:data][:subcategory]
      @forecast_rows_backup = current_user.forecast_row_backups.where("data ->> 'Sub-Category' = ?", subcategory_name)
      @forecast_rows_backup_header = @forecast_rows_backup.map(&:data).flat_map(&:keys).uniq
      @forecast_rows_header = @forecast_rows_backup_header
    elsif params[:data].present? && params[:data][:category].present?
      category_name = params[:data][:category]
      @forecast_rows_backup = current_user.forecast_row_backups.where("data ->> 'Category' = ?", category_name)
      @forecast_rows_backup_header = @forecast_rows_backup.map(&:data).flat_map(&:keys).uniq
      @forecast_rows_header = @forecast_rows_backup_header
    else
      forecast_row_backups = current_user.forecast_row_backups
      @forecast_rows_backup = forecast_row_backups.all.order(:id)
      @forecast_rows_backup_header = @forecast_rows_backup.map(&:data).flat_map(&:keys).uniq
      @forecast_rows_header = @forecast_rows_backup_header
    end

    render partial: "forecast_rows/backup_table_frame"
  end
  def create
    if params[:file]
      CsvImportService.import(params[:file], current_user, params[:decimal_format])
      redirect_to forecast_rows_path, notice: 'Forecast file successfully uploaded.'
    else
      redirect_to forecast_rows_path, alert: 'Please upload a CSV file.'
    end
  end

  def update
    row = current_user.forecast_rows.find(params[:id])
    if params[:changed_key].present?
      changed_key = params[:changed_key]
      percent_change = params[:percent_change]
      current_user.forecast_rows.find_each do |row|
        next unless row.data[changed_key] # optional: skip rows that don't have the key
        real_value = row.data[changed_key]&.to_f
        changed_value = real_value.to_f * (percent_change.to_f / 100.0)
        remain_value = real_value + changed_value
        row.data[changed_key] = remain_value.to_i # Replace with your new value
        row.save!
      end
      render json: { status: 'updated' }
    end
  end

  def destroy_all
    current_user.forecast_rows.destroy_all
    current_user.forecast_row_backups.destroy_all
    redirect_to forecast_rows_path, notice: 'Forecast Database clear.'
  end
  def load_select
    forecast_rows1 = current_user.forecast_rows
    level = params[:level]
    case level
    when 'product'
      @product_names = ["Total"] + forecast_rows1.all.map { |row| row.data["Product"] }.uniq
    when 'subcategory'
      @subcategories = ["Total"] + forecast_rows1.all.map { |row| row.data["Sub-Category"] }.uniq
    when 'category'
      @categories = ["Total"] + forecast_rows1.all.map { |row| row.data["Category"] }.uniq
    end

    render partial: "#{level}_select"
  end

  # app/controllers/forecast_rows_controller.rb
  def table_difference
    if params[:data].present? && params[:data][:product].present?
      forecast_id = params.dig(:data, :product)
      single_row_difference(forecast_id)
    elsif params[:data].present? && params[:data][:subcategory].present?
      subcategory_name = params[:data][:subcategory]
      @forecast_rows = current_user.forecast_rows.includes(:forecast_row_backup).where("data ->> 'Sub-Category' = ?", subcategory_name)
      @comparison_data = []
      @all_keys = []
      priority_cols = ["Product", "Category", "Sub-Category"]
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

          if priority_cols.include?(key)
            # Show original text value for these columns
            original.to_s
          else
            if is_numeric?(original) && is_numeric?(updated)
              (updated.to_f - original.to_f).round(2)
            else
              original.to_s == updated.to_s ? 0 : 'changed'
            end
          end
        end

        @comparison_data << {
          row_id: row.id,
          values: differences
        }
      end
    elsif params[:data].present? && params[:data][:category].present?
      category_name = params[:data][:category]
      @forecast_rows = current_user.forecast_rows.includes(:forecast_row_backup).where("data ->> 'Category' = ?", category_name)
      @comparison_data = []
      @all_keys = []
      priority_cols = ["Product", "Category", "Sub-Category"]
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

          if priority_cols.include?(key)
            # Show original text value for these columns
            original.to_s
          else
            if is_numeric?(original) && is_numeric?(updated)
              (updated.to_f - original.to_f).round(2)
            else
              original.to_s == updated.to_s ? 0 : 'changed'
            end
          end
        end

        @comparison_data << {
          row_id: row.id,
          values: differences
        }
      end
    else
      @forecast_rows = current_user.forecast_rows.includes(:forecast_row_backup)
      @comparison_data = []
      @all_keys = []
      priority_cols = ["Product", "Category", "Sub-Category"]
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

          if priority_cols.include?(key)
            # Show original text value for these columns
            original.to_s
          else
            if is_numeric?(original) && is_numeric?(updated)
              (updated.to_f - original.to_f).round(2)
            else
              original.to_s == updated.to_s ? 0 : 'changed'
            end
          end
        end

        @comparison_data << {
          row_id: row.id,
          values: differences
        }
      end
    end
    render partial: "forecast_rows/difference_table_frame"
  end

  def single_row_difference(forecast_id)
    @forecast_row = current_user.forecast_rows.includes(:forecast_row_backup).find(forecast_id)
    @comparison_data = []
    @all_keys = []

    priority_cols = ["Product", "Category", "Sub-Category"]

    backup = @forecast_row.forecast_row_backup
    if backup
      current_data = @forecast_row.data
      backup_data = backup.data

      keys = (current_data.keys + backup_data.keys).uniq.sort
      @all_keys = keys

      differences = keys.map do |key|
        original = backup_data[key]
        updated = current_data[key]

        if priority_cols.include?(key)
          # Show original text value for these columns
          original.to_s
        else
          if is_numeric?(original) && is_numeric?(updated)
            (updated.to_f - original.to_f).round(2)
          else
            original.to_s == updated.to_s ? 0 : 'changed'
          end
        end
      end

      @comparison_data << {
        row_id: @forecast_row.id,
        values: differences
      }
    end
  end

  private

  def db_exist?
    forecast_rows = current_user.forecast_rows
    if forecast_rows.present?
      redirect_to forecast_rows_path, alert: 'Please clear Forecast Database first.'
      return
    end
  end
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
    forecast_rows = current_user.forecast_rows.all.order(:id).first(count)

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
    forecast_rows = current_user.forecast_rows.all.order(:id).first(count)

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
