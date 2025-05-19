class PlanPurchaseRequestsController < BaseController

  def new
    @subscription_plans = SubscriptionPlan.all
    selected_plan = SubscriptionPlan.find_by(id: params[:plan_id])

    @plan_purchase_request = current_user.plan_purchase_requests.build(
      subscription_plan: selected_plan
    )
  end


  def create
    @plan_purchase_request = current_user.plan_purchase_requests.build(plan_purchase_request_params)
    @subscription_plans = SubscriptionPlan.all
    if @plan_purchase_request.save
      redirect_to forecast_rows_path, notice: 'Your request has been submitted.'
      return
    else
      render :new
    end
  end

  private

  def plan_purchase_request_params
    params.require(:plan_purchase_request).permit(
      :subscription_plan_id, :first_name, :last_name, :company, :function, :email,
      :country, :state, :agreed_to_terms
    )
  end


end