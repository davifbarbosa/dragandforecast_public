class AddDefaultToSubscriptionPlans < ActiveRecord::Migration[7.1]
  def change
    add_column :subscription_plans, :default, :boolean, default: false

  end
end
