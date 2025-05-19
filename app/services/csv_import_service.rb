require 'csv'

class CsvImportService
  def self.import(file)
    rows = []
    CSV.foreach(file.path, headers: true) do |row|
      rows << ForecastRow.new(data: row.to_h)
    end
    ForecastRow.import(rows) # bulk insert
    ForecastRowBackup.import(rows) # bulk insert
  end
end
