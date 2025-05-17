require "test_helper"

class CsvFilesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @csv_file = csv_files(:one)
  end

  test "should get index" do
    get csv_files_url
    assert_response :success
  end

  test "should get new" do
    get new_csv_file_url
    assert_response :success
  end

  test "should create csv_file" do
    assert_difference("CsvFile.count") do
      post csv_files_url, params: { csv_file: { filename: @csv_file.filename, row_count: @csv_file.row_count, user_id: @csv_file.user_id } }
    end

    assert_redirected_to csv_file_url(CsvFile.last)
  end

  test "should show csv_file" do
    get csv_file_url(@csv_file)
    assert_response :success
  end

  test "should get edit" do
    get edit_csv_file_url(@csv_file)
    assert_response :success
  end

  test "should update csv_file" do
    patch csv_file_url(@csv_file), params: { csv_file: { filename: @csv_file.filename, row_count: @csv_file.row_count, user_id: @csv_file.user_id } }
    assert_redirected_to csv_file_url(@csv_file)
  end

  test "should destroy csv_file" do
    assert_difference("CsvFile.count", -1) do
      delete csv_file_url(@csv_file)
    end

    assert_redirected_to csv_files_url
  end
end
