class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  belongs_to :subscription_plan, optional: true
  has_many :csv_files

  enum role: { user: 0, admin: 1 }
  after_create :assign_default_plan

  private

  def assign_default_plan
    default_plan = SubscriptionPlan.find_by(default: true)
    self.update(subscription_plan: default_plan) if default_plan
  end
end
