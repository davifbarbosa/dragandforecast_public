class Admin::UsersController < BaseController
  before_action :authorize_admin

  def index
    @users = User.all
  end

  def edit
    @user = User.find(params[:id])
  end

  def update
    @user = User.find(params[:id])
    if @user.update(user_params)
      redirect_to admin_users_path, notice: 'User updated.'
    else
      render :edit
    end
  end

  def destroy
    User.find(params[:id]).destroy
    redirect_to admin_users_path, notice: 'User deleted.'
  end

  private


  def user_params
    params.require(:user).permit(:email, :role, :subscription_plan_id)
  end
end
