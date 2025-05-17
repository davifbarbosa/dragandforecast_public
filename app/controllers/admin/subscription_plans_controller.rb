module Admin
  class SubscriptionPlansController < BaseController
    before_action :authenticate_user!
    before_action :require_admin
    before_action :set_subscription_plan, only: [:show, :edit, :update, :destroy]
    layout "admin"

    def index
      @subscription_plans = SubscriptionPlan.all
    end

    def show
    end

    def new
      @subscription_plan = SubscriptionPlan.new
    end

    def create
      @subscription_plan = SubscriptionPlan.new(subscription_plan_params)
      if @subscription_plan.save
        redirect_to admin_subscription_plans_path, notice: 'Subscription plan created successfully.'
      else
        render :new
      end
    end

    def edit
    end

    def update
      if @subscription_plan.update(subscription_plan_params)
        redirect_to admin_subscription_plans_path, notice: 'Subscription plan updated successfully.'
      else
        render :edit
      end
    end

    def destroy
      @subscription_plan.destroy
      redirect_to admin_subscription_plans_path, notice: 'Subscription plan deleted successfully.'
    end

    private

    def set_subscription_plan
      @subscription_plan = SubscriptionPlan.find(params[:id])
    end

    def subscription_plan_params
      params.require(:subscription_plan).permit(:name, :row_limit, :price, :default)
    end

    def require_admin
      redirect_to root_path, alert: "Access denied." unless current_user&.admin?
    end
  end
end
