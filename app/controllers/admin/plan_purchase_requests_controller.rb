module Admin
  class PlanPurchaseRequestsController < BaseController
    def index
      @requests = PlanPurchaseRequest.all.order(created_at: :desc)
    end

    def update
      @purchase_request = PlanPurchaseRequest.find(params[:id])
      if @purchase_request.update(status: params[:status])
        if @purchase_request.approved?
          plan = @purchase_request.subscription_plan
          user = @purchase_request.user
          user.update(subscription_plan: plan)
        end
        redirect_to admin_plan_purchase_requests_path, notice: "Status updated."
      else
        redirect_to admin_plan_purchase_requests_path, alert: "Update failed."
      end
    end
  end
end