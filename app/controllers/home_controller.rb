class HomeController < ApplicationController

  def index
    @subscription_plans = SubscriptionPlan.all
  end

end