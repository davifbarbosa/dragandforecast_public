require "application_system_test_case"

class CsvFilesTest < ApplicationSystemTestCase
  setup do
    @csv_file = csv_files(:one)
  end

  test "visiting the index" do
    visit csv_files_url
    assert_selector "h1", text: "Csv files"
  end

  test "should create csv file" do
    visit csv_files_url
    click_on "New csv file"

    fill_in "Filename", with: @csv_file.filename
    fill_in "Row count", with: @csv_file.row_count
    fill_in "User", with: @csv_file.user_id
    click_on "Create Csv file"

    assert_text "Csv file was successfully created"
    click_on "Back"
  end

  test "should update Csv file" do
    visit csv_file_url(@csv_file)
    click_on "Edit this csv file", match: :first

    fill_in "Filename", with: @csv_file.filename
    fill_in "Row count", with: @csv_file.row_count
    fill_in "User", with: @csv_file.user_id
    click_on "Update Csv file"

    assert_text "Csv file was successfully updated"
    click_on "Back"
  end

  test "should destroy Csv file" do
    visit csv_file_url(@csv_file)
    click_on "Destroy this csv file", match: :first

    assert_text "Csv file was successfully destroyed"
  end
end
