class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  belongs_to :subscription_plan, optional: true
  has_many :forecast_rows, dependent: :destroy
  has_many :forecast_row_backups, dependent: :destroy
  has_many :actuals, dependent: :destroy
  has_many :plan_purchase_requests

  enum role: { user: 0, admin: 1 }
  after_create :assign_default_plan

  private

  def assign_default_plan
    default_plan = SubscriptionPlan.find_by(default: true)
    self.update(subscription_plan: default_plan) if default_plan
  end
end
