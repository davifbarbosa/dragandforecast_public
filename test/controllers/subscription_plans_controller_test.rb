require "test_helper"

class SubscriptionPlansControllerTest < ActionDispatch::IntegrationTest
  setup do
    @subscription_plan = subscription_plans(:one)
  end

  test "should get index" do
    get subscription_plans_url
    assert_response :success
  end

  test "should get new" do
    get new_subscription_plan_url
    assert_response :success
  end

  test "should create subscription_plan" do
    assert_difference("SubscriptionPlan.count") do
      post subscription_plans_url, params: { subscription_plan: { name: @subscription_plan.name, price: @subscription_plan.price, row_limit: @subscription_plan.row_limit } }
    end

    assert_redirected_to subscription_plan_url(SubscriptionPlan.last)
  end

  test "should show subscription_plan" do
    get subscription_plan_url(@subscription_plan)
    assert_response :success
  end

  test "should get edit" do
    get edit_subscription_plan_url(@subscription_plan)
    assert_response :success
  end

  test "should update subscription_plan" do
    patch subscription_plan_url(@subscription_plan), params: { subscription_plan: { name: @subscription_plan.name, price: @subscription_plan.price, row_limit: @subscription_plan.row_limit } }
    assert_redirected_to subscription_plan_url(@subscription_plan)
  end

  test "should destroy subscription_plan" do
    assert_difference("SubscriptionPlan.count", -1) do
      delete subscription_plan_url(@subscription_plan)
    end

    assert_redirected_to subscription_plans_url
  end
end
