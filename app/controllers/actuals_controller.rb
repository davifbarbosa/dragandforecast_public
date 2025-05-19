class ActualsController < BaseController
  def index

  end

  def create
    if params[:file]
      CsvImportService.actuals_import(params[:file], current_user)
      redirect_to forecast_rows_path, notice: 'Actuals file successfully uploaded.'
    else
      redirect_to forecast_rows_path, alert: 'Please upload a CSV file.'
    end
  end

  def update
    row = current_user.actuals.find(params[:id])
    row.update(data: params[:data])
    render json: { status: 'updated' }
  end

  def destroy_all
    current_user.actuals.destroy_all
    redirect_to forecast_rows_path, notice: 'Actuals Database clear.'
  end

end
