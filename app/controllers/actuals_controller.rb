class ActualsController < BaseController
  def index

  end

  def create
    if params[:file]
      CsvImportService.actuals_import(params[:file])
      redirect_to forecast_rows_path, notice: 'CSV uploaded.'
    else
      redirect_to forecast_rows_path, alert: 'Please upload a CSV file.'
    end
  end

  def update
    row = Actual.find(params[:id])
    row.update(data: params[:data])
    render json: { status: 'updated' }
  end
end
