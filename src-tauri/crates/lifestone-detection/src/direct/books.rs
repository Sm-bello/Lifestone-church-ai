/// Information about a single Bible book.
pub struct BookInfo {
    pub number: i32,
    pub name: &'static str,
    pub abbreviation: &'static str,
    pub aliases: &'static [&'static str],
}

pub const BOOKS: &[BookInfo] = &[
    // Old Testament
    BookInfo { number: 1, name: "Genesis", abbreviation: "Gen", aliases: &["Gen", "Ge", "Gn", "Génesis"] },
    BookInfo { number: 2, name: "Exodus", abbreviation: "Exod", aliases: &["Exod", "Exo", "Ex", "Éxodo", "Exodo"] },
    BookInfo { number: 3, name: "Leviticus", abbreviation: "Lev", aliases: &["Lev", "Le", "Lv", "Levítico", "Levitico"] },
    BookInfo { number: 4, name: "Numbers", abbreviation: "Num", aliases: &["Num", "Nu", "Nm", "Nb", "Números", "Numeros"] },
    BookInfo { number: 5, name: "Deuteronomy", abbreviation: "Deut", aliases: &["Deut", "De", "Dt", "Deuteronomio"] },
    BookInfo { number: 6, name: "Joshua", abbreviation: "Josh", aliases: &["Josh", "Jos", "Jsh", "Josué", "Josue"] },
    BookInfo { number: 7, name: "Judges", abbreviation: "Judg", aliases: &["Judg", "Jdg", "Jg", "Jdgs", "Jueces"] },
    BookInfo { number: 8, name: "Ruth", abbreviation: "Ruth", aliases: &["Ruth", "Rth", "Ru"] },
    BookInfo {
        number: 9, name: "1 Samuel", abbreviation: "1 Sam",
        aliases: &["1 Sam", "1 Sa", "1Sam", "1Sa", "First Samuel", "1st Samuel", "I Samuel"],
    },
    BookInfo {
        number: 10, name: "2 Samuel", abbreviation: "2 Sam",
        aliases: &["2 Sam", "2 Sa", "2Sam", "2Sa", "Second Samuel", "2nd Samuel", "II Samuel"],
    },
    BookInfo {
        number: 11, name: "1 Kings", abbreviation: "1 Kgs",
        aliases: &["1 Kgs", "1 Ki", "1Kgs", "1Ki", "First Kings", "1st Kings", "I Kings", "1 Reyes", "I Reyes"],
    },
    BookInfo {
        number: 12, name: "2 Kings", abbreviation: "2 Kgs",
        aliases: &["2 Kgs", "2 Ki", "2Kgs", "2Ki", "Second Kings", "2nd Kings", "II Kings", "2 Reyes", "II Reyes"],
    },
    BookInfo {
        number: 13, name: "1 Chronicles", abbreviation: "1 Chr",
        aliases: &["1 Chr", "1 Ch", "1Chr", "1Ch", "First Chronicles", "1st Chronicles", "I Chronicles", "1 Crónicas", "1 Cronicas", "I Crónicas", "I Cronicas"],
    },
    BookInfo {
        number: 14, name: "2 Chronicles", abbreviation: "2 Chr",
        aliases: &["2 Chr", "2 Ch", "2Chr", "2Ch", "Second Chronicles", "2nd Chronicles", "II Chronicles", "2 Crónicas", "2 Cronicas", "II Crónicas", "II Cronicas"],
    },
    BookInfo { number: 15, name: "Ezra", abbreviation: "Ezra", aliases: &["Ezra", "Ezr", "Esdras"] },
    BookInfo { number: 16, name: "Nehemiah", abbreviation: "Neh", aliases: &["Neh", "Ne", "Nehemías", "Nehemias"] },
    BookInfo { number: 17, name: "Esther", abbreviation: "Esth", aliases: &["Esth", "Est", "Es", "Ester"] },
    BookInfo { number: 18, name: "Job", abbreviation: "Job", aliases: &["Job", "Jb"] },
    BookInfo { number: 19, name: "Psalms", abbreviation: "Ps", aliases: &["Psalm", "Psalms", "Ps", "Psa", "Psm", "Pss", "Salmos", "Salmo"] },
    BookInfo { number: 20, name: "Proverbs", abbreviation: "Prov", aliases: &["Prov", "Pro", "Prv", "Pr", "Proverbios"] },
    BookInfo { number: 21, name: "Ecclesiastes", abbreviation: "Eccl", aliases: &["Eccl", "Ecc", "Ec", "Qoh", "Eclesiastés", "Eclesiastes"] },
    BookInfo { number: 22, name: "Song of Solomon", abbreviation: "Song", aliases: &["Song", "Song of Solomon", "Song of Songs", "SOS", "So", "Cant", "Cantares", "Cantar de los Cantares"] },
    BookInfo { number: 23, name: "Isaiah", abbreviation: "Isa", aliases: &["Isa", "Is", "Isaías", "Isaias"] },
    BookInfo { number: 24, name: "Jeremiah", abbreviation: "Jer", aliases: &["Jer", "Je", "Jr", "Jeremías", "Jeremias"] },
    BookInfo { number: 25, name: "Lamentations", abbreviation: "Lam", aliases: &["Lam", "La", "Lamentaciones"] },
    BookInfo { number: 26, name: "Ezekiel", abbreviation: "Ezek", aliases: &["Ezek", "Eze", "Ezk", "Ezequiel"] },
    BookInfo { number: 27, name: "Daniel", abbreviation: "Dan", aliases: &["Dan", "Da", "Dn"] },
    BookInfo { number: 28, name: "Hosea", abbreviation: "Hos", aliases: &["Hos", "Ho", "Oseas"] },
    BookInfo { number: 29, name: "Joel", abbreviation: "Joel", aliases: &["Joel", "Jl"] },
    BookInfo { number: 30, name: "Amos", abbreviation: "Amos", aliases: &["Amos", "Am", "Amós"] },
    BookInfo { number: 31, name: "Obadiah", abbreviation: "Obad", aliases: &["Obad", "Ob", "Abdías", "Abdias"] },
    BookInfo { number: 32, name: "Jonah", abbreviation: "Jonah", aliases: &["Jonah", "Jnh", "Jon", "Jonás", "Jonas"] },
    BookInfo { number: 33, name: "Micah", abbreviation: "Mic", aliases: &["Mic", "Mc", "Miqueas"] },
    BookInfo { number: 34, name: "Nahum", abbreviation: "Nah", aliases: &["Nah", "Na", "Nahúm"] },
    BookInfo { number: 35, name: "Habakkuk", abbreviation: "Hab", aliases: &["Hab", "Hb", "Habacuc"] },
    BookInfo { number: 36, name: "Zephaniah", abbreviation: "Zeph", aliases: &["Zeph", "Zep", "Zp", "Sofonías", "Sofonias"] },
    BookInfo { number: 37, name: "Haggai", abbreviation: "Hag", aliases: &["Hag", "Hg", "Hageo"] },
    BookInfo { number: 38, name: "Zechariah", abbreviation: "Zech", aliases: &["Zech", "Zec", "Zc", "Zacarías", "Zacarias"] },
    BookInfo { number: 39, name: "Malachi", abbreviation: "Mal", aliases: &["Mal", "Ml", "Malaquías", "Malaquias"] },

    // New Testament
    BookInfo { number: 40, name: "Matthew", abbreviation: "Matt", aliases: &["Matt", "Mat", "Mt", "Mateo"] },
    BookInfo { number: 41, name: "Mark", abbreviation: "Mark", aliases: &["Mark", "Mrk", "Mk", "Mr", "Marcos"] },
    BookInfo { number: 42, name: "Luke", abbreviation: "Luke", aliases: &["Luke", "Luk", "Lk", "Lucas"] },
    BookInfo { number: 43, name: "John", abbreviation: "John", aliases: &["John", "Joh", "Jhn", "Jn", "Juan"] },
    BookInfo { number: 44, name: "Acts", abbreviation: "Acts", aliases: &["Acts", "Act", "Ac", "Hechos"] },
    BookInfo { number: 45, name: "Romans", abbreviation: "Rom", aliases: &["Rom", "Ro", "Rm", "Romanos"] },
    BookInfo {
        number: 46, name: "1 Corinthians", abbreviation: "1 Cor",
        aliases: &["1 Cor", "1 Co", "1Cor", "1Co", "First Corinthians", "1st Corinthians", "I Corinthians", "1 Corintios", "I Corintios"],
    },
    BookInfo {
        number: 47, name: "2 Corinthians", abbreviation: "2 Cor",
        aliases: &["2 Cor", "2 Co", "2Cor", "2Co", "Second Corinthians", "2nd Corinthians", "II Corinthians", "2 Corintios", "II Corintios"],
    },
    BookInfo { number: 48, name: "Galatians", abbreviation: "Gal", aliases: &["Gal", "Ga", "Gálatas", "Galatas"] },
    BookInfo { number: 49, name: "Ephesians", abbreviation: "Eph", aliases: &["Eph", "Ephes", "Efesios"] },
    BookInfo { number: 50, name: "Philippians", abbreviation: "Phil", aliases: &["Phil", "Php", "Pp", "Filipenses"] },
    BookInfo { number: 51, name: "Colossians", abbreviation: "Col", aliases: &["Col", "Co", "Colosenses"] },
    BookInfo {
        number: 52, name: "1 Thessalonians", abbreviation: "1 Thess",
        aliases: &["1 Thess", "1 Th", "1Thess", "1Th", "First Thessalonians", "1st Thessalonians", "I Thessalonians", "1 Tesalonicenses", "I Tesalonicenses"],
    },
    BookInfo {
        number: 53, name: "2 Thessalonians", abbreviation: "2 Thess",
        aliases: &["2 Thess", "2 Th", "2Thess", "2Th", "Second Thessalonians", "2nd Thessalonians", "II Thessalonians", "2 Tesalonicenses", "II Tesalonicenses"],
    },
    BookInfo {
        number: 54, name: "1 Timothy", abbreviation: "1 Tim",
        aliases: &["1 Tim", "1 Ti", "1Tim", "1Ti", "First Timothy", "1st Timothy", "I Timothy", "1 Timoteo", "I Timoteo"],
    },
    BookInfo {
        number: 55, name: "2 Timothy", abbreviation: "2 Tim",
        aliases: &["2 Tim", "2 Ti", "2Tim", "2Ti", "Second Timothy", "2nd Timothy", "II Timothy", "2 Timoteo", "II Timoteo"],
    },
    BookInfo { number: 56, name: "Titus", abbreviation: "Titus", aliases: &["Titus", "Tit", "Ti", "Tito"] },
    BookInfo { number: 57, name: "Philemon", abbreviation: "Phlm", aliases: &["Phlm", "Phm", "Philem", "Filemón", "Filemon"] },
    BookInfo { number: 58, name: "Hebrews", abbreviation: "Heb", aliases: &["Heb", "Hebreos"] },
    BookInfo { number: 59, name: "James", abbreviation: "Jas", aliases: &["Jas", "Jm", "Santiago"] },
    BookInfo {
        number: 60, name: "1 Peter", abbreviation: "1 Pet",
        aliases: &["1 Pet", "1 Pe", "1Pet", "1Pe", "First Peter", "1st Peter", "I Peter", "1 Pedro", "I Pedro"],
    },
    BookInfo {
        number: 61, name: "2 Peter", abbreviation: "2 Pet",
        aliases: &["2 Pet", "2 Pe", "2Pet", "2Pe", "Second Peter", "2nd Peter", "II Peter", "2 Pedro", "II Pedro"],
    },
    BookInfo {
        number: 62, name: "1 John", abbreviation: "1 John",
        aliases: &["1 John", "1 Jn", "1John", "1Jn", "First John", "1st John", "I John", "1 Juan", "I Juan"],
    },
    BookInfo {
        number: 63, name: "2 John", abbreviation: "2 John",
        aliases: &["2 John", "2 Jn", "2John", "2Jn", "Second John", "2nd John", "II John", "2 Juan", "II Juan"],
    },
    BookInfo {
        number: 64, name: "3 John", abbreviation: "3 John",
        aliases: &["3 John", "3 Jn", "3John", "3Jn", "Third John", "3rd John", "III John", "3 Juan", "III Juan"],
    },
    BookInfo { number: 65, name: "Jude", abbreviation: "Jude", aliases: &["Jude", "Jud", "Jd", "Judas"] },
    BookInfo { number: 66, name: "Revelation", abbreviation: "Rev", aliases: &["Rev", "Re", "Rv", "Apocalypse", "Apocalipsis"] },
];
