class SubscriptionPlan < ApplicationRecord
  has_many :users
  before_save :unset_other_defaults, if: :default?
  private

  def unset_other_defaults
    SubscriptionPlan.where.not(id: self.id).update_all(default: false)
  end
end
