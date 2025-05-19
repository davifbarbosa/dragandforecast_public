class BaseController < ApplicationController
  layout :layout_by_resource
  include Pundit::Authorization
  before_action :authenticate_user!


  private
  def authorize_admin
    redirect_to root_path, alert: 'Not authorized.' unless current_user.admin?
  end
  def layout_by_resource
    if current_user&.admin?
      "admin"
    else
      "application"
    end
  end
end
