use std::{fs, io::Write, time::Instant};

use bincode::config;
use ironcalc::import::load_model_from_xlsx;
use ironcalc_base::{types::Workbook, model::Model};


fn main() {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 2 {
        panic!("Usage: {} <file.xlsx>", args[0]);
    }
    let file_name = &args[1];
    let now = Instant::now();
    let mut model = load_model_from_xlsx(file_name, "en", "UTC").unwrap();
    let elapsed_time = now.elapsed();
    println!("Loaded model from xlsx: {:?}", elapsed_time);
    model.evaluate();
    let now = Instant::now();
    let s = model.to_json_str();
    let elapsed_time = now.elapsed();
    println!("Stringify json: {:?}", elapsed_time);
    {
        let now = Instant::now();
        let decoded : Workbook = serde_json::from_str(&s).unwrap();
        let elapsed_time = now.elapsed();
        println!("Parse from json: {:?} and name {}", elapsed_time, decoded.name);
    }
    let file_name_json = format!("{}.json", file_name);
    let file_path = std::path::Path::new(&file_name_json);
    let mut file = fs::File::create(file_path).unwrap();
    file.write_all(s.as_bytes()).unwrap();
    let now = Instant::now();
    let s = model.to_binary_str();
    let elapsed_time = now.elapsed();
    println!("stringify to binary: {:?}", elapsed_time);
    {
        let config = config::standard();
        let now = Instant::now();
        let (decoded, _): (Workbook, usize) = bincode::decode_from_slice(&s[..], config).unwrap();
        let elapsed_time = now.elapsed();
        println!("Parse from binary: {:?} and {}", elapsed_time, decoded.name);
    }
    let file_name_binary = format!("{}.binary", file_name);
    let file_path = std::path::Path::new(&file_name_binary);
    let mut file = fs::File::create(file_path).unwrap();
    file.write_all(&s).unwrap();
    {
        let config = config::standard();
        let now = Instant::now();
        let s = &fs::read(file_name_binary).unwrap();
        let (decoded, _): (Workbook, usize) = bincode::decode_from_slice(&s[..], config).unwrap();
        let model = Model::from_workbook(decoded).unwrap();
        let elapsed_time = now.elapsed();
        println!("Loaded from binary file: {:?} and {}", elapsed_time, model.workbook.name);

    }
}

