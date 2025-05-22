Rails.application.routes.draw do
  root 'home#index'
  # get 'load_actuals', to: 'forecast#load_actuals', as: 'load_actuals'
  # post 'upload', to: 'forecast#upload', as: 'upload'
  post 'upload_data', to: 'forecast#upload_data'
  post 'upload_actuals', to: 'forecast#upload_actuals'
  post 'save_data', to: 'forecast#save_data'
  get 'load_data', to: 'forecast#load_data'
  get 'load_actuals', to: 'forecast#load_actuals'
  post 'clear_data', to: 'forecast#clear_data'
  post 'clear_actuals', to: 'forecast#clear_actuals'
  post 'create-backup', to: 'dashboard#create_backup'
  get 'forecast', to: 'forecast_rows#index', as: 'forecast'
  get 'load_select', to: 'forecast_rows#load_select'
  get "forecast_rows/export", to: "forecast_rows#export", defaults: { format: :xlsx }
  resources :forecast_rows, only: [:index, :create, :update]
  resources :forecast_rows do
    collection do
      get :table_difference
      get :table_backup
      get :table_modify
      delete :destroy_all
    end
  end
  resources :actuals, only: [:index, :create, :update]
  resources :actuals do
    collection do
      delete :destroy_all
    end
  end

  resources :subscription_plans, only: [:index, :show] do
    get 'buy', to: 'plan_purchase_requests#new', as: 'buy'
  end

  resources :plan_purchase_requests, only: [:create]

  namespace :admin do
    resources :users
    resources :subscription_plans
    resources :plan_purchase_requests, only: [:index, :update]
  end
  resources :csv_files, only: [:new, :create]
  # resources :subscription_plans
  devise_for :users
  resources :users do
    member do
      patch :update_chart_colors
    end
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
