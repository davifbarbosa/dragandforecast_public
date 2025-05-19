class ForecastRow < ApplicationRecord
  belongs_to :user
  has_one :forecast_row_backup, dependent: :destroy
end
