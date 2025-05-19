class CreateForecastRowBackups < ActiveRecord::Migration[7.1]
  def change
    create_table :forecast_row_backups do |t|
      t.jsonb :data

      t.timestamps
    end
  end
end
