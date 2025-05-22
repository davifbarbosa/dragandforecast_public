class UsersController < BaseController
  # PATCH /users/:id/update_chart_colors
  def update_chart_colors
    if current_user.id != params[:id].to_i
      redirect_to root_path, alert: "Unauthorized access."
      return
    end

    if current_user.update(user_color_params)
      redirect_to forecast_rows_path, notice: "Chart color preferences updated successfully."
    else
      redirect_to forecast_rows_path, alert: "Failed to update chart colors."
    end
  end

  private

  def user_color_params
    params.permit(:green_periods, :blue_periods, :red_periods)
  end
end