class AddColorPeriodsToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :green_periods, :integer
    add_column :users, :blue_periods, :integer
    add_column :users, :red_periods, :integer
  end
end
