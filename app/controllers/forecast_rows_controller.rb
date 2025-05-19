class ForecastRowsController < BaseController
  def index
    if params[:product].present? && params[:product] != "Total"
      @forecast_rows = ForecastRow.where("data ->> 'Product' = ?", params[:product])
      @forecast_rows_backup = ForecastRowBackup.where("data ->> 'Product' = ?", params[:product])
    else
      @forecast_rows = ForecastRow.all.order(:id)
      @forecast_rows_backup = ForecastRowBackup.all.order(:id)
    end
    @product_names = ["Total"] + ForecastRow.all.map { |row| row.data["Product"] }.uniq
    @forecast_rows_backup_header = @forecast_rows_backup.map(&:data).flat_map(&:keys).uniq
    @forecast_rows_header = @forecast_rows_backup_header
    @actuals = Actual.order(:id)
    @sum_of_averages1 = first_three_months_average(1)
    @sum_of_averages2 = six_months_average(1)
  end

  def create
    if params[:file]
      CsvImportService.import(params[:file])
      redirect_to forecast_rows_path, notice: 'CSV uploaded.'
    else
      redirect_to forecast_rows_path, alert: 'Please upload a CSV file.'
    end
  end

  def update
    row = ForecastRow.find(params[:id])
    row.update(data: params[:data])
    render json: { status: 'updated' }
  end

  private

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
