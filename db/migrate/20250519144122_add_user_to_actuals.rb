class AddUserToActuals < ActiveRecord::Migration[7.1]
  def change
    add_reference :actuals, :user, null: false, foreign_key: true
  end
end
