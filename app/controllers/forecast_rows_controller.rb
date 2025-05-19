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
end
