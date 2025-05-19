class AddForecastRowToForecastRowBackupsc < ActiveRecord::Migration[7.1]
  def change
    add_reference :forecast_row_backups, :forecast_row, null: false, foreign_key: true
  end
end
