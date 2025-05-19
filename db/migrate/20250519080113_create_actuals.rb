class CreateActuals < ActiveRecord::Migration[7.1]
  def change
    create_table :actuals do |t|
      t.jsonb :data

      t.timestamps
    end
  end
end
