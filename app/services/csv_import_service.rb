require 'csv'

class CsvImportService
  def self.import(file, user)
    rows = []

    CSV.foreach(file.path, headers: true) do |row|
      rows << ForecastRow.new(user: user, data: row.to_h)
    end

    # Bulk insert forecast rows
    ForecastRow.import(rows)

    # Fetch inserted records in correct order (assuming no other inserts happened between)
    inserted_rows = ForecastRow.where(user: user).order(created_at: :asc).limit(rows.size)

    # Check: make sure we got the right number of inserted rows
    return if inserted_rows.size != rows.size

    # Build ForecastRowBackup records
    backups = inserted_rows.map do |forecast_row|
      ForecastRowBackup.new(user: user,
        forecast_row_id: forecast_row.id,
        data: forecast_row.data
      )
    end

    # Import backups
    result = ForecastRowBackup.import(backups)
    # Check for failed inserts
    if result.failed_instances.any?
      puts "Backup insert failed for:"
      result.failed_instances.each do |fail|
        puts fail.errors.full_messages
      end
    end
  end

  def self.actuals_import(file, user)
    rows = []
    CSV.foreach(file.path, headers: true) do |row|
      rows << Actual.new(user: user, data: row.to_h)
    end
    Actual.import(rows) # bulk insert
  end


end
