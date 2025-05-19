require 'csv'

class CsvImportService
  def self.import(file, user)
    rows = []
    CSV.foreach(file.path, headers: true) do |row|
      rows << ForecastRow.new(user: user, data: row.to_h)
    end
    ForecastRow.import(rows) # bulk insert
    ForecastRowBackup.import(rows) # bulk insert
  end

  def self.actuals_import(file, user)
    rows = []
    CSV.foreach(file.path, headers: true) do |row|
      rows << Actual.new(user: user, data: row.to_h)
    end
    Actual.import(rows) # bulk insert
  end


end
