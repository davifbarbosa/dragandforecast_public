class CreatePlanPurchaseRequests < ActiveRecord::Migration[7.1]
  def change
    create_table :plan_purchase_requests do |t|
      t.references :user, null: false, foreign_key: true
      t.references :subscription_plan, null: false, foreign_key: true
      t.string :first_name
      t.string :last_name
      t.string :company
      t.string :function
      t.string :email
      t.string :country
      t.string :state
      t.boolean :agreed_to_terms
      t.integer :status, default: 0

      t.timestamps
    end
  end
end
