class CreateCsvFiles < ActiveRecord::Migration[7.1]
  def change
    create_table :csv_files do |t|
      t.references :user, null: false, foreign_key: true
      t.string :filename
      t.integer :row_count

      t.timestamps
    end
  end
end
