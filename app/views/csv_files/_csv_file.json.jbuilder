json.extract! csv_file, :id, :user_id, :filename, :row_count, :created_at, :updated_at
json.url csv_file_url(csv_file, format: :json)
