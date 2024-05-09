//! Converts an xlsx file into the binary IronCalc format
//!
//! Usage: xlsx_2_icalc file.xlsx

use std::path;

use ironcalc::{export::save_to_icalc, import::load_from_xlsx};

fn main() {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 2 {
        panic!("Usage: {} <file.xlsx>", args[0]);
    }
    let file_name = &args[1];

    let file_path = path::Path::new(file_name);
    let base_name = file_path.file_stem().unwrap().to_str().unwrap();
    let output_file_name = &format!("{base_name}.ic");
    let model = load_from_xlsx(file_name, "en", "UTC").unwrap();
    save_to_icalc(model.workbook, output_file_name);
}
