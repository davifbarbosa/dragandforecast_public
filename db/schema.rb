# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_05_21_051909) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "actuals", force: :cascade do |t|
    t.jsonb "data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_actuals_on_user_id"
  end

  create_table "csv_files", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "filename"
    t.integer "row_count"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_csv_files_on_user_id"
  end

  create_table "forecast_row_backups", force: :cascade do |t|
    t.jsonb "data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.bigint "forecast_row_id", null: false
    t.index ["forecast_row_id"], name: "index_forecast_row_backups_on_forecast_row_id"
    t.index ["user_id"], name: "index_forecast_row_backups_on_user_id"
  end

  create_table "forecast_rows", force: :cascade do |t|
    t.jsonb "data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_forecast_rows_on_user_id"
  end

  create_table "plan_purchase_requests", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "subscription_plan_id", null: false
    t.string "first_name"
    t.string "last_name"
    t.string "company"
    t.string "function"
    t.string "email"
    t.string "country"
    t.string "state"
    t.boolean "agreed_to_terms"
    t.integer "status", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["subscription_plan_id"], name: "index_plan_purchase_requests_on_subscription_plan_id"
    t.index ["user_id"], name: "index_plan_purchase_requests_on_user_id"
  end

  create_table "subscription_plans", force: :cascade do |t|
    t.string "name"
    t.integer "row_limit"
    t.decimal "price"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "default", default: false
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "role", default: 0
    t.bigint "subscription_plan_id"
    t.string "first_name"
    t.string "last_name"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["subscription_plan_id"], name: "index_users_on_subscription_plan_id"
  end

  add_foreign_key "actuals", "users"
  add_foreign_key "csv_files", "users"
  add_foreign_key "forecast_row_backups", "forecast_rows"
  add_foreign_key "forecast_row_backups", "users"
  add_foreign_key "forecast_rows", "users"
  add_foreign_key "plan_purchase_requests", "subscription_plans"
  add_foreign_key "plan_purchase_requests", "users"
  add_foreign_key "users", "subscription_plans"
end
