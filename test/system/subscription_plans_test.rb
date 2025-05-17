require "application_system_test_case"

class SubscriptionPlansTest < ApplicationSystemTestCase
  setup do
    @subscription_plan = subscription_plans(:one)
  end

  test "visiting the index" do
    visit subscription_plans_url
    assert_selector "h1", text: "Subscription plans"
  end

  test "should create subscription plan" do
    visit subscription_plans_url
    click_on "New subscription plan"

    fill_in "Name", with: @subscription_plan.name
    fill_in "Price", with: @subscription_plan.price
    fill_in "Row limit", with: @subscription_plan.row_limit
    click_on "Create Subscription plan"

    assert_text "Subscription plan was successfully created"
    click_on "Back"
  end

  test "should update Subscription plan" do
    visit subscription_plan_url(@subscription_plan)
    click_on "Edit this subscription plan", match: :first

    fill_in "Name", with: @subscription_plan.name
    fill_in "Price", with: @subscription_plan.price
    fill_in "Row limit", with: @subscription_plan.row_limit
    click_on "Update Subscription plan"

    assert_text "Subscription plan was successfully updated"
    click_on "Back"
  end

  test "should destroy Subscription plan" do
    visit subscription_plan_url(@subscription_plan)
    click_on "Destroy this subscription plan", match: :first

    assert_text "Subscription plan was successfully destroyed"
  end
end
