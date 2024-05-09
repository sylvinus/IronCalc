#![allow(clippy::unwrap_used)]

use crate::UserModel;

#[test]
fn shift_cells_general() {
    let mut model = UserModel::new_empty("model", "en", "UTC").unwrap();
    // some reference value in A1
    model.set_user_input(0, 1, 1, "42").unwrap();

    // We put some values in row 5
    model.set_user_input(0, 5, 3, "=1 + 1").unwrap(); // C5
    model.set_user_input(0, 5, 7, "=C5*A1").unwrap();

    // Insert one cell in C5 and push right
    model.insert_cells_and_shift_right(0, 5, 3, 1, 1).unwrap();

    // C5 should now be empty
    assert_eq!(model.get_cell_content(0, 5, 3), Ok("".to_string()));

    // D5 should have 2
    assert_eq!(model.get_cell_content(0, 5, 4), Ok("=1+1".to_string()));
}
