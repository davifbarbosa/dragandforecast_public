class CreateForecastRows < ActiveRecord::Migration[7.1]
  def change
    create_table :forecast_rows do |t|
      t.jsonb :data

      t.timestamps
    end
  end
end
