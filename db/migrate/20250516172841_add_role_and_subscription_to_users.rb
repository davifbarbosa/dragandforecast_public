class AddRoleAndSubscriptionToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :role, :integer, default: 0
    add_reference :users, :subscription_plan, foreign_key: true
  end
end
