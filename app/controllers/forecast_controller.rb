class ForecastController < BaseController
  # before_action :set_csv_file, only: %i[ show edit update destroy ]

  # GET /csv_files or /csv_files.json
  def index

  end

  # GET /csv_files/1 or /csv_files/1.json
  def show
  end

  # GET /csv_files/new
  def new
    @csv_file = CsvFile.new
  end

  # GET /csv_files/1/edit
  def edit
  end

  # POST /csv_files or /csv_files.json
  def create
    uploaded_file = params[:csv_file][:file]
    rows = CSV.read(uploaded_file.path).size
    row_limit = current_user.subscription_plan.row_limit

    if row_limit && rows > row_limit
      redirect_to new_csv_file_path, alert: "You exceeded your plan limit. Please upgrade."
    else
      @csv_file = current_user.csv_files.build(
        filename: uploaded_file.original_filename,
        row_count: rows
      )
      if @csv_file.save
        redirect_to root_path, notice: 'File uploaded successfully.'
      else
        render :new
      end
    end
  end

  # PATCH/PUT /csv_files/1 or /csv_files/1.json
  def update
    respond_to do |format|
      if @csv_file.update(csv_file_params)
        format.html { redirect_to @csv_file, notice: "Csv file was successfully updated." }
        format.json { render :show, status: :ok, location: @csv_file }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @csv_file.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /csv_files/1 or /csv_files/1.json
  def destroy
    @csv_file.destroy!

    respond_to do |format|
      format.html { redirect_to csv_files_path, status: :see_other, notice: "Csv file was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
  # Use callbacks to share common setup or constraints between actions.
  def set_csv_file
    @csv_file = CsvFile.find(params[:id])
  end

  # Only allow a list of trusted parameters through.
  def csv_file_params
    params.require(:csv_file).permit(:user_id, :filename, :row_count)
  end
end
