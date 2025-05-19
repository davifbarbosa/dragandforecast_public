class ForecastController < BaseController
  require 'csv'

  @@data_storage = {
    table_data: nil,
    original_table_data: nil,
    table_periods: nil
  }

  @@actuals_storage = {
    actuals_data: nil
  }

  def index
  end

  def upload_data
    file = params[:file]

    unless file
      return render json: { error: "No file uploaded." }, status: :bad_request
    end

    begin
      # Read file content with proper encoding handling
      content = file.read.force_encoding('UTF-8').encode('UTF-8', invalid: :replace, undef: :replace, replace: '')

      # Remove BOM if present (common with Excel-generated files)
      content = content.sub(/\A\xEF\xBB\xBF/, '')

      # Parse CSV with headers
      csv = CSV.parse(content, headers: true)

      # Convert to array of hashes
      data = csv.map(&:to_h)

      render json: {
        message: "File processed successfully!",
        data: data,
        headers: csv.headers
      }

    rescue CSV::MalformedCSVError => e
      render json: {
        error: "Invalid CSV format",
        details: e.message
      }, status: :unprocessable_entity

    rescue Encoding::UndefinedConversionError => e
      render json: {
        error: "Encoding error",
        details: "Please ensure the file is UTF-8 encoded",
        suggestion: "Try saving the file in Excel as 'CSV UTF-8 (Comma delimited)'"
      }, status: :unprocessable_entity

    rescue => e
      render json: {
        error: "File processing failed",
        details: e.message
      }, status: :internal_server_error
    end
  end

  def upload_actuals
    file = params[:file]
    if file
      csv = CSV.parse(file.read, headers: true)
      data = csv.map(&:to_h)
      @@actuals_storage[:actuals_data] = data
      render json: { message: "Actuals data processed!", data: data }
    else
      render json: { error: "No actuals file uploaded." }, status: :bad_request
    end
  end
  def create_backup
    begin
      data = params[:data]
      periods = params[:periods]

      unless data && periods
        return render json: { error: "Dados ou períodos ausentes" }, status: :bad_request
      end

      backup_table = data.deep_dup
      difference_table = data.map do |row|
        diff = {
          "Product" => row["Product"],
          "Sub-Category" => row["Sub-Category"],
          "Category" => row["Category"]
        }

        periods.each do |p|
          original = row[p].to_f
          modified = row[p].to_f # simulate backup difference logic
          diff[p] = (modified - original).round(2)
        end

        diff
      end

      render json: {
        backupTable: backup_table,
        differenceTable: difference_table
      }
    rescue => e
      render json: { error: "Erro interno", details: e.message }, status: :internal_server_error
    end
  end


  def load_actuals
    if @@actuals_storage[:actuals_data].present?
      render json: { actuals_data: @@actuals_storage[:actuals_data] }
    else
      render json: { error: "No actuals data found." }, status: :not_found
    end
  end

  def save_data
    payload = JSON.parse(request.body.read)
    @@data_storage[:table_data] = payload["tableData"]
    @@data_storage[:original_table_data] = payload["originalTableData"]
    @@data_storage[:table_periods] = payload["tablePeriods"]
    render json: { message: "Data saved successfully!" }
  end

  def load_data
    if @@data_storage.values.any?(&:nil?)
      render json: { error: "No data found." }, status: :not_found
    else
      render json: {
        tableData: @@data_storage[:table_data],
        originalTableData: @@data_storage[:original_table_data],
        tablePeriods: @@data_storage[:table_periods]
      }
    end
  end

  def clear_data
    @@data_storage = {
      table_data: nil,
      original_table_data: nil,
      table_periods: nil
    }
    render json: { message: "Data cleared successfully." }
  end

  def clear_actuals
    @@actuals_storage = { actuals_data: nil }
    render json: { message: "Actuals data cleared successfully." }
  end
end
