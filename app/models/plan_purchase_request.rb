class PlanPurchaseRequest < ApplicationRecord
  belongs_to :user
  belongs_to :subscription_plan

  enum status: { pending: 0, approved: 1, rejected: 2 }

  validates :first_name, :last_name, :email, :country, :state, :agreed_to_terms, presence: true
  validates :agreed_to_terms, acceptance: true
end
