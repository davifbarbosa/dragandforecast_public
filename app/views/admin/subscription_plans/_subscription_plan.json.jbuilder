json.extract! subscription_plan, :id, :name, :row_limit, :price, :created_at, :updated_at
json.url subscription_plan_url(subscription_plan, format: :json)
