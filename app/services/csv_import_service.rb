require 'csv'

class CsvImportService
  def self.import(file, user, decimal_format = ".")
    rows = []

    CSV.foreach(file.path, headers: true) do |row|
      normalized_data = normalize_row(row.to_h, decimal_format)
      rows << ForecastRow.new(user: user, data: normalized_data)
    end

    ForecastRow.import(rows)

    inserted_rows = ForecastRow.where(user: user).order(created_at: :asc).limit(rows.size)
    return if inserted_rows.size != rows.size

    backups = inserted_rows.map do |forecast_row|
      ForecastRowBackup.new(
        user: user,
        forecast_row_id: forecast_row.id,
        data: forecast_row.data
      )
    end

    result = ForecastRowBackup.import(backups)
    if result.failed_instances.any?
      puts "Backup insert failed for:"
      result.failed_instances.each { |fail| puts fail.errors.full_messages }
    end
  end

  def self.actuals_import(file, user, decimal_format = ".")
    rows = []
    CSV.foreach(file.path, headers: true) do |row|
      normalized_data = normalize_row(row.to_h, decimal_format)
      rows << Actual.new(user: user, data: normalized_data)
    end

    Actual.import(rows)
  end

  private

  def self.normalize_row(row_data, decimal_format)
    # Remove caractere BOM invisível (\uFEFF) das chaves
    clean_data = row_data.transform_keys { |key| key.to_s.gsub("\uFEFF", "") }

    # Normaliza os valores numéricos (como já era feito)
    clean_data.transform_values do |value|
      normalize_decimal_value(value, decimal_format)
    end
  end


  def self.normalize_decimal_value(value, decimal_format)
    return value if value.blank?

    # Only normalize if it's a number-like string
    if value =~ /\A[\d.,]+\z/
      case decimal_format
      when "comma"
        # Remove thousand separators (dots) and convert comma to dot
        value.gsub(".", "").gsub(",", ".")
      when "dot"
        # Remove thousand separators (commas)
        value.gsub(",", "")
      else
        value
      end
    else
      value # Return original if not a number
    end
  end



end
