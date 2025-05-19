class ForecastRowBackup < ApplicationRecord
  belongs_to :user
  belongs_to :forecast_row
end
