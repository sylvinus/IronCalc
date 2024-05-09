#![allow(clippy::unwrap_used)]

use crate::test::util::new_empty_model;

#[test]
fn shift_cells_right() {
    let mut model = new_empty_model();
    let (sheet, row, column) = (0, 5, 3); // C5
    model.set_user_input(sheet, row, column, "Hi".to_string());
    model.set_user_input(sheet, row, column + 1, "world".to_string());
    model.set_user_input(sheet, row, column + 2, "!".to_string());

    model
        .insert_cells_and_shift_right(sheet, row, column, 1, 1)
        .unwrap();
    model.evaluate();

    assert_eq!(model.get_cell_content(0, 5, 3), Ok("".to_string()));
    assert_eq!(model.get_cell_content(0, 5, 4), Ok("Hi".to_string()));
}

#[test]
fn shift_cells_right_with_formulas() {
    let mut model = new_empty_model();
    let (sheet, row, column) = (0, 5, 3); // C5
    model.set_user_input(sheet, row, column - 1, "23".to_string());
    model.set_user_input(sheet, row, column, "42".to_string());
    model.set_user_input(sheet, row, column + 1, "=C5*2".to_string());
    model.set_user_input(sheet, row, column + 2, "=A5+2".to_string());
    model.set_user_input(sheet, 20, 3, "=C5*A2".to_string());
    model.evaluate();

    model
        .insert_cells_and_shift_right(sheet, row, column, 1, 1)
        .unwrap();

    model.evaluate();
    assert_eq!(
        model.get_cell_content(0, row, column - 1),
        Ok("23".to_string())
    );
    assert_eq!(model.get_cell_content(0, row, column), Ok("".to_string()));
    assert_eq!(
        model.get_cell_content(0, row, column + 1),
        Ok("42".to_string())
    );
    assert_eq!(
        model.get_cell_content(0, row, column + 2),
        Ok("=D5*2".to_string())
    );
    assert_eq!(
        model.get_cell_content(0, row, column + 3),
        Ok("=A5+2".to_string())
    );
    assert_eq!(model.get_cell_content(0, 20, 3), Ok("=D5*A2".to_string()));
}

#[test]
fn shift_cells_left() {
    let mut model = new_empty_model();
    let (sheet, row, column) = (0, 5, 10); // J5
    model.set_user_input(sheet, row, column - 1, "23".to_string());
    model.set_user_input(sheet, row, column, "42".to_string());
    model.set_user_input(sheet, row, column + 1, "Hi".to_string());
    model.set_user_input(sheet, row, column + 2, "honey!".to_string());
    model.evaluate();

    model
        .delete_cells_and_shift_left(sheet, row, column, 1, 1)
        .unwrap();

    model.evaluate();
    assert_eq!(
        model.get_cell_content(0, row, column - 1),
        Ok("23".to_string())
    );

    assert_eq!(model.get_cell_content(0, row, column), Ok("Hi".to_string()));
    assert_eq!(
        model.get_cell_content(0, row, column + 1),
        Ok("honey!".to_string())
    );
}

#[test]
fn shift_cells_left_with_formulas() {
    let mut model = new_empty_model();
    let (sheet, row, column) = (0, 5, 10); // J5
    model.set_user_input(sheet, row, column - 1, "23".to_string());
    model.set_user_input(sheet, row, column, "42".to_string());
    model.set_user_input(sheet, row, column + 1, "33".to_string());
    model.set_user_input(sheet, row, column + 2, "=K5*A5".to_string());

    model.set_user_input(sheet, row, column + 20, "=K5*A5".to_string());
    model.evaluate();

    model
        .delete_cells_and_shift_left(sheet, row, column, 1, 1)
        .unwrap();

    model.evaluate();
    assert_eq!(
        model.get_cell_content(0, row, column + 1),
        Ok("=J5*A5".to_string())
    );
    assert_eq!(
        model.get_cell_content(0, row, column + 19),
        Ok("=J5*A5".to_string())
    );
}
