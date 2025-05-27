class Admin::UsersController < BaseController
  before_action :authorize_admin

  def index
    @users = User.all
  end

  def edit
    @subscription_plans = SubscriptionPlan.all
    @user = User.find(params[:id])
  end

  def update
    @user = User.find(params[:id])
    if @user.update(user_params)
      redirect_to admin_users_path, notice: 'User updated.'
    else
      @subscription_plans = SubscriptionPlan.all
      render :edit
    end
  end

def destroy
  user = User.find(params[:id])
  if user == current_user
    redirect_to admin_users_path, alert: 'Você não pode se excluir.'
  else
    user.destroy
    redirect_to admin_users_path, notice: 'Usuário deletado com sucesso.'
  end
end


  private

  def user_params
    permitted = [:first_name, :last_name, :email, :subscription_plan_id]
    if params[:user][:password].present?
      permitted += [:password, :password_confirmation]
    end
    params.require(:user).permit(permitted)
  end
end
