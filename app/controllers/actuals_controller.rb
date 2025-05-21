class ActualsController < BaseController
  before_action :check_uploaded_file, only: %i[ create ]
  before_action :db_exist?, only: %i[ create ]
  def index

  end

  def create
    if params[:file]
      CsvImportService.actuals_import(params[:file], current_user, params[:decimal_format])
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

  private

  def db_exist?
    actual_rows = current_user.actuals
    if actual_rows.present?
      redirect_to forecast_rows_path, alert: 'Please clear Actual Database first.'
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

end
