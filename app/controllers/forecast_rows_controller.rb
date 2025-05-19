class ForecastRowsController < BaseController
  def index
    forecast_rows = current_user.forecast_rows
    forecast_row_backups = current_user.forecast_row_backups
    actuals = current_user.actuals
    if params[:product].present? && params[:product] != "Total"
      @forecast_rows = forecast_rows.where("data ->> 'Product' = ?", params[:product])
      @forecast_rows_backup = forecast_row_backups.where("data ->> 'Product' = ?", params[:product])
    else
      @forecast_rows = forecast_rows.all.order(:id)
      @forecast_rows_backup = forecast_row_backups.all.order(:id)
    end
    @product_names = ["Total"] + forecast_rows.all.map { |row| row.data["Product"] }.uniq
    @forecast_rows_backup_header = @forecast_rows_backup.map(&:data).flat_map(&:keys).uniq
    @forecast_rows_header = @forecast_rows_backup_header
    @actuals = actuals.order(:id)
    @sum_of_averages1 = first_three_months_average(1)
    @sum_of_averages2 = six_months_average(1)

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
    row.update(data: params[:data])
    render json: { status: 'updated' }
  end

  def destroy_all
    current_user.forecast_rows.destroy_all
    current_user.forecast_row_backups.destroy_all
    redirect_to forecast_rows_path, notice: 'Forecast Database clear.'
  end

  private

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
