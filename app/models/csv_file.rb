class CsvFile < ApplicationRecord
  belongs_to :user
  validates :row_count, presence: true
end
