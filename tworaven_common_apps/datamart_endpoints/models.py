from django.db import models

DATAMART_SOURCES = (u'ISI', u'NYU')

DATAMART_ISI_URL = 'https://dsbox02.isi.edu:9000'
DATAMART_NYU_URL = 'https://datamart.d3m.vida-nyu.org'

cached_response = '''[{
      "summary": " - SUMMARY OF THE DATAMART DATASET -atamart ID: 127860000core: 84.735825itle: FIFA World Cupescription: FIFA World CupRL: https://www.football-data.orgolumns: ] id ] season_id ] season_startDate ] season_endDate ] season_currentMatchday ] utcDate ] status ] matchday ] stage ] group 0] lastUpdated 1] score_winner 2] score_duration 3] score_fullTime_homeTeam 4] score_fullTime_awayTeam 5] score_halfTime_homeTeam 6] score_halfTime_awayTeam 7] score_extraTime_homeTeam 8] score_extraTime_awayTeam 9] score_penalties_homeTeam 0] score_penalties_awayTeam 1] homeTeam_id 2] homeTeam_name (Egypt, Uruguay, Colombia ...)3] awayTeam_id 4] awayTeam_name (Uruguay, Egypt, Colombia ...)5] referees_0_id 6] referees_0_name (Bjrn Kuipers, Enrique Cceres, Malang Didhiou ...)7] referees_0_nationality 8] referees_1_id 9] referees_1_name (Bahattin Duran, Joe Fletcher, Jure Praprotnik ...)0] referees_1_nationality 1] referees_2_id 2] referees_2_name (Marcelo Carvalho Van Gasse, Frank Anderson, Tark Ongun ...)3] referees_2_nationality 4] referees_3_id 5] referees_3_name (Norbert Hauata, John Pitti, Bjrn Kuipers ...)6] referees_3_nationality 7] referees_4_id 8] referees_4_name (Hiroshi Yamauchi, Bahattin Duran, Massimiliano Irrati ...)9] referees_4_nationality 0] referees_5_id 1] referees_5_name (Artur Soares Dias, Mauro Vigliano, Clment Turpin ...)2] referees_5_nationality 3] referees_6_id 4] referees_6_name (Artur Soares Dias, Bastian Dankert, Carlos Astroza ...)5] referees_6_nationality 6] referees_7_id 7] referees_7_name (Artur Soares Dias, Bastian Dankert, Carlos Astroza ...)8] referees_7_nationality 9] referees_8_id 0] referees_8_name (Artur Soares Dias, Bastian Dankert, Sandro Ricci ...)1] referees_8_nationality ecommend Join Columns:   Original Columns <-> datamart.Dataset Columns               [3] <-> [24]                               [4] <-> [22]                    ",
      "score": 84.735825,
      "metadata": {
        "datamart_id": 127860000,
        "title": "FIFA World Cup",
        "description": "FIFA World Cup",
        "url": "https://www.football-data.org",
        "keywords": [
          "football",
          "competition"
        ],
        "provenance": {
          "source": "www.football-data.org"
        },
        "materialization": {
          "python_path": "football_match_materializer",
          "arguments": {
            "uri": "/v2/competitions/2000/matches?limit=999",
            "token": "d019bc4541c9490fabcba6806cbcc42b"
          }
        },
        "variables": [
          {
            "datamart_id": 127860001,
            "name": "id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: id, dtype: int64"
          },
          {
            "datamart_id": 127860002,
            "name": "season_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: season_id, dtype: int64"
          },
          {
            "datamart_id": 127860003,
            "name": "season_startDate",
            "semantic_type": [
              "https://metadata.datadrivendiscovery.org/types/Time"
            ],
            "description": "column name: season_startDate, dtype: object"
          },
          {
            "datamart_id": 127860004,
            "name": "season_endDate",
            "semantic_type": [
              "https://metadata.datadrivendiscovery.org/types/Time"
            ],
            "description": "column name: season_endDate, dtype: object"
          },
          {
            "datamart_id": 127860005,
            "name": "season_currentMatchday",
            "semantic_type": [],
            "description": "column name: season_currentMatchday, dtype: int64"
          },
          {
            "datamart_id": 127860006,
            "name": "utcDate",
            "semantic_type": [
              "https://metadata.datadrivendiscovery.org/types/Time"
            ],
            "temporal_coverage": {
              "start": "2018-06-14T15:00:00+00:00",
              "end": "2018-07-15T15:00:00+00:00"
            },
            "description": "column name: utcDate, dtype: object"
          },
          {
            "datamart_id": 127860007,
            "name": "status",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "description": "column name: status, dtype: object"
          },
          {
            "datamart_id": 127860008,
            "name": "matchday",
            "semantic_type": [],
            "description": "column name: matchday, dtype: float64"
          },
          {
            "datamart_id": 127860009,
            "name": "stage",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "description": "column name: stage, dtype: object"
          },
          {
            "datamart_id": 127860010,
            "name": "group",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "description": "column name: group, dtype: object"
          },
          {
            "datamart_id": 127860011,
            "name": "lastUpdated",
            "semantic_type": [
              "https://metadata.datadrivendiscovery.org/types/Time"
            ],
            "temporal_coverage": {
              "start": "2018-06-22T10:00:01+00:00",
              "end": "2018-07-15T20:00:01+00:00"
            },
            "description": "column name: lastUpdated, dtype: object"
          },
          {
            "datamart_id": 127860012,
            "name": "score_winner",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "description": "column name: score_winner, dtype: object"
          },
          {
            "datamart_id": 127860013,
            "name": "score_duration",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "description": "column name: score_duration, dtype: object"
          },
          {
            "datamart_id": 127860014,
            "name": "score_fullTime_homeTeam",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: score_fullTime_homeTeam, dtype: int64"
          },
          {
            "datamart_id": 127860015,
            "name": "score_fullTime_awayTeam",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: score_fullTime_awayTeam, dtype: int64"
          },
          {
            "datamart_id": 127860016,
            "name": "score_halfTime_homeTeam",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: score_halfTime_homeTeam, dtype: int64"
          },
          {
            "datamart_id": 127860017,
            "name": "score_halfTime_awayTeam",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: score_halfTime_awayTeam, dtype: int64"
          },
          {
            "datamart_id": 127860018,
            "name": "score_extraTime_homeTeam",
            "semantic_type": [],
            "description": "column name: score_extraTime_homeTeam, dtype: float64"
          },
          {
            "datamart_id": 127860019,
            "name": "score_extraTime_awayTeam",
            "semantic_type": [],
            "description": "column name: score_extraTime_awayTeam, dtype: float64"
          },
          {
            "datamart_id": 127860020,
            "name": "score_penalties_homeTeam",
            "semantic_type": [],
            "description": "column name: score_penalties_homeTeam, dtype: float64"
          },
          {
            "datamart_id": 127860021,
            "name": "score_penalties_awayTeam",
            "semantic_type": [],
            "description": "column name: score_penalties_awayTeam, dtype: float64"
          },
          {
            "datamart_id": 127860022,
            "name": "homeTeam_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: homeTeam_id, dtype: int64"
          },
          {
            "datamart_id": 127860023,
            "name": "homeTeam_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Egypt",
              "Uruguay",
              "Colombia",
              "Argentina",
              "Tunisia",
              "France",
              "Korea Republic",
              "Panama",
              "Iceland",
              "Mexico",
              "Croatia",
              "England",
              "Switzerland",
              "Poland",
              "Serbia",
              "Saudi Arabia",
              "Spain",
              "Belgium",
              "Costa Rica",
              "Australia",
              "Russia",
              "Senegal",
              "Brazil",
              "Iran",
              "Denmark",
              "Japan",
              "Portugal",
              "Nigeria",
              "Germany",
              "Sweden",
              "Peru",
              "Morocco"
            ],
            "description": "column name: homeTeam_name, dtype: object"
          },
          {
            "datamart_id": 127860024,
            "name": "awayTeam_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: awayTeam_id, dtype: int64"
          },
          {
            "datamart_id": 127860025,
            "name": "awayTeam_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Uruguay",
              "Egypt",
              "Colombia",
              "Argentina",
              "Tunisia",
              "France",
              "Korea Republic",
              "Panama",
              "Iceland",
              "Mexico",
              "England",
              "Croatia",
              "Switzerland",
              "Serbia",
              "Poland",
              "Saudi Arabia",
              "Spain",
              "Belgium",
              "Costa Rica",
              "Australia",
              "Russia",
              "Senegal",
              "Brazil",
              "Iran",
              "Denmark",
              "Japan",
              "Portugal",
              "Nigeria",
              "Germany",
              "Sweden",
              "Peru",
              "Morocco"
            ],
            "description": "column name: awayTeam_name, dtype: object"
          },
          {
            "datamart_id": 127860026,
            "name": "referees_0_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: referees_0_id, dtype: int64"
          },
          {
            "datamart_id": 127860027,
            "name": "referees_0_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Bjrn Kuipers",
              "Enrique Cceres",
              "Malang Didhiou",
              "Sandro Ricci",
              "Nstor Pitana",
              "Mohammed Abdulla Hassan",
              "Matt Conger",
              "Jair Marrufo",
              "Sergey Karasev",
              "Antonio Matu",
              "Clment Turpin",
              "Damir Skomina",
              "Wilmar Roldn",
              "Alireza Faghani",
              "Gehad Grisha",
              "Milorad Mai",
              "Nawaf Shukralla",
              "Gianluca Rocchi",
              "Andrs Cunha",
              "Csar Arturo Ramos",
              "Janny Sikazwe",
              "Cneyt akr",
              "Ravshan Irmatov",
              "Szymon Marciniak",
              "Bakary Papa Gassama",
              "Felix Brych",
              "Csar Ramos",
              "Mark Geiger",
              "Joel Aguilar"
            ],
            "description": "column name: referees_0_name, dtype: object"
          },
          {
            "datamart_id": 127860028,
            "name": "referees_0_nationality",
            "semantic_type": [],
            "description": "column name: referees_0_nationality, dtype: object"
          },
          {
            "datamart_id": 127860029,
            "name": "referees_1_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: referees_1_id, dtype: int64"
          },
          {
            "datamart_id": 127860030,
            "name": "referees_1_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Bahattin Duran",
              "Joe Fletcher",
              "Jure Praprotnik",
              "Elenito Di Liberatore",
              "Pau Cebrin",
              "Mohamed Ahmed Al Hammadi",
              "Marvin Torrentera",
              "Reza Sokhandan",
              "Abdukhamidullo Rasulov",
              "Corey Rockwell",
              "Redouane Achik",
              "Eduardo Cardozo",
              "Jerson dos Santos",
              "Nicols Tarn",
              "Juan Pablo Belatti",
              "Mark Borsch",
              "Emerson Augusto De Carvalho",
              "Nicolas Danos",
              "Hernn Maidana",
              "Sander van Roekel",
              "Jean-Claude Birumushahu",
              "Anton Averianov",
              "Djibril Camara",
              "Milovan Risti",
              "Pawe Sokolnicki",
              "Simon Lount",
              "Yaser Tulefat",
              "Alexander Guzmn",
              "Juan Zumba"
            ],
            "description": "column name: referees_1_name, dtype: object"
          },
          {
            "datamart_id": 127860031,
            "name": "referees_1_nationality",
            "semantic_type": [],
            "description": "column name: referees_1_nationality, dtype: object"
          },
          {
            "datamart_id": 127860032,
            "name": "referees_2_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: referees_2_id, dtype: int64"
          },
          {
            "datamart_id": 127860033,
            "name": "referees_2_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Marcelo Carvalho Van Gasse",
              "Frank Anderson",
              "Tark Ongun",
              "Stefan Lupp",
              "Waleed Ahmed Ali",
              "Abdelhak Etchiali",
              "Mauricio Espinosa",
              "Mauro Tonolini",
              "Roberto Daz",
              "Taleb Salem Al Marri",
              "Dalibor urevi",
              "Juan Carlos Mora",
              "Juan Zorrilla",
              "Tomasz Listkiewicz",
              "Miguel ngel Hernndez",
              "Erwin Zeinstra",
              "Zakhele Siwela",
              "Juan Pablo Belatti",
              "Tevita Makasini",
              "Jakhongir Saidov",
              "Christian de la Cruz",
              "Cyril Gringore",
              "Hernn Maidana",
              "El Hadji Malick Samba",
              "Tikhon Kalugin",
              "Mohammadreza Mansouri",
              "Hasan Mohamed Al Mahri",
              "Robert Vukan",
              "Juan Zumba"
            ],
            "description": "column name: referees_2_name, dtype: object"
          },
          {
            "datamart_id": 127860034,
            "name": "referees_2_nationality",
            "semantic_type": [],
            "description": "column name: referees_2_nationality, dtype: object"
          },
          {
            "datamart_id": 127860035,
            "name": "referees_3_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: referees_3_id, dtype: int64"
          },
          {
            "datamart_id": 127860036,
            "name": "referees_3_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Norbert Hauata",
              "John Pitti",
              "Bjrn Kuipers",
              "Enrique Cceres",
              "Malang Didhiou",
              "Sandro Ricci",
              "Mohammed Abdulla Hassan",
              "Matt Conger",
              "Mehdi Abid Charef",
              "Ryji Sat",
              "Abdelrahman Al Jassim",
              "Julio Bascun",
              "Sergey Karasev",
              "Jair Marrufo",
              "Antonio Matu",
              "Clment Turpin",
              "Damir Skomina",
              "Wilmar Roldn",
              "Alireza Faghani",
              "Milorad Mai",
              "Bamlak Tessema",
              "Nawaf Shukralla",
              "Gianluca Rocchi",
              "Andrs Cunha",
              "Csar Arturo Ramos",
              "Janny Sikazwe",
              "Cneyt akr",
              "Bakary Papa Gassama",
              "Ricardo Montero"
            ],
            "description": "column name: referees_3_name, dtype: object"
          },
          {
            "datamart_id": 127860037,
            "name": "referees_3_nationality",
            "semantic_type": [],
            "description": "column name: referees_3_nationality, dtype: object"
          },
          {
            "datamart_id": 127860038,
            "name": "referees_4_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: referees_4_id, dtype: int64"
          },
          {
            "datamart_id": 127860039,
            "name": "referees_4_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Hiroshi Yamauchi",
              "Bahattin Duran",
              "Massimiliano Irrati",
              "Felix Zwayer",
              "Jure Praprotnik",
              "Christian Schiemann",
              "Mauricio Espinosa",
              "Pau Cebrin",
              "Mohamed Ahmed Al Hammadi",
              "Mauro Tonolini",
              "Marvin Torrentera",
              "Taleb Salem Al Marri",
              "Juan Carlos Mora",
              "Corey Rockwell",
              "Daniele Orsato",
              "Bertrand Brial",
              "Jerson dos Santos",
              "Nicols Tarn",
              "Eduardo Cardozo",
              "Erwin Zeinstra",
              "Anouar Hmila",
              "Emerson Augusto De Carvalho",
              "Toru Sagara",
              "Sander van Roekel",
              "Danny Makkelie",
              "Anton Averianov",
              "Tikhon Kalugin",
              "Djibril Camara",
              "Hasan Mohamed Al Mahri",
              "Milovan Risti",
              "Yaser Tulefat",
              "Gabriel Victoria",
              "Alexander Guzmn"
            ],
            "description": "column name: referees_4_name, dtype: object"
          },
          {
            "datamart_id": 127860040,
            "name": "referees_4_nationality",
            "semantic_type": [],
            "description": "column name: referees_4_nationality, dtype: object"
          },
          {
            "datamart_id": 127860041,
            "name": "referees_5_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: referees_5_id, dtype: int64"
          },
          {
            "datamart_id": 127860042,
            "name": "referees_5_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Artur Soares Dias",
              "Mauro Vigliano",
              "Clment Turpin",
              "Paolo Valeri",
              "Bastian Dankert",
              "Sandro Ricci",
              "Mark Borsch",
              "Carlos Astroza",
              "Felix Zwayer",
              "Massimiliano Irrati",
              "Szymon Marciniak",
              "Daniele Orsato",
              "Mark Geiger",
              "Tiago Martins",
              "Danny Makkelie",
              "Roberto Daz"
            ],
            "description": "column name: referees_5_name, dtype: object"
          },
          {
            "datamart_id": 127860043,
            "name": "referees_5_nationality",
            "semantic_type": [],
            "description": "column name: referees_5_nationality, dtype: object"
          },
          {
            "datamart_id": 127860044,
            "name": "referees_6_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: referees_6_id, dtype: int64"
          },
          {
            "datamart_id": 127860045,
            "name": "referees_6_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Artur Soares Dias",
              "Bastian Dankert",
              "Carlos Astroza",
              "Joe Fletcher",
              "Felix Zwayer",
              "Tiago Martins",
              "Abdelrahman Al Jassim",
              "Jair Marrufo",
              "Roberto Daz",
              "Paolo Valeri",
              "Clment Turpin",
              "Gery Vargas",
              "Corey Rockwell",
              "Daniele Orsato",
              "Cyril Gringore",
              "Hernn Maidana",
              "Sander van Roekel",
              "Mauro Vigliano",
              "Pawe Gil",
              "Pawe Sokolnicki",
              "Wilton Pereira Sampaio"
            ],
            "description": "column name: referees_6_name, dtype: object"
          },
          {
            "datamart_id": 127860046,
            "name": "referees_6_nationality",
            "semantic_type": [],
            "description": "column name: referees_6_nationality, dtype: object"
          },
          {
            "datamart_id": 127860047,
            "name": "referees_7_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: referees_7_id, dtype: int64"
          },
          {
            "datamart_id": 127860048,
            "name": "referees_7_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Artur Soares Dias",
              "Bastian Dankert",
              "Carlos Astroza",
              "Joe Fletcher",
              "Massimiliano Irrati",
              "Felix Zwayer",
              "Elenito Di Liberatore",
              "Tiago Martins",
              "Roberto Daz",
              "Paolo Valeri",
              "Gery Vargas",
              "Marvin Torrentera",
              "Taleb Salem Al Marri",
              "Corey Rockwell",
              "Tevita Makasini",
              "Mark Borsch",
              "Emerson Augusto De Carvalho",
              "Cyril Gringore",
              "Hernn Maidana",
              "Nicolas Danos",
              "Sander van Roekel",
              "Danny Makkelie",
              "Mauro Vigliano",
              "Pawe Gil",
              "Pawe Sokolnicki",
              "Simon Lount",
              "Alexander Guzmn"
            ],
            "description": "column name: referees_7_name, dtype: object"
          },
          {
            "datamart_id": 127860049,
            "name": "referees_7_nationality",
            "semantic_type": [],
            "description": "column name: referees_7_nationality, dtype: object"
          },
          {
            "datamart_id": 127860050,
            "name": "referees_8_id",
            "semantic_type": [
              "http://schema.org/Integer"
            ],
            "description": "column name: referees_8_id, dtype: int64"
          },
          {
            "datamart_id": 127860051,
            "name": "referees_8_name",
            "semantic_type": [
              "http://schema.org/Text"
            ],
            "named_entity": [
              "Artur Soares Dias",
              "Bastian Dankert",
              "Sandro Ricci",
              "Felix Zwayer",
              "Massimiliano Irrati",
              "Tiago Martins",
              "Pau Cebrin",
              "Jair Marrufo",
              "Clment Turpin",
              "Paolo Valeri",
              "Gery Vargas",
              "Reza Sokhandan",
              "Corey Rockwell",
              "Daniele Orsato",
              "Gianluca Rocchi",
              "Jean-Claude Birumushahu",
              "Danny Makkelie",
              "Mauro Vigliano",
              "Pawe Gil",
              "Szymon Marciniak",
              "Yaser Tulefat",
              "Mark Geiger",
              "Wilton Pereira Sampaio"
            ],
            "description": "column name: referees_8_name, dtype: object"
          },
          {
            "datamart_id": 127860052,
            "name": "referees_8_nationality",
            "semantic_type": [],
            "description": "column name: referees_8_nationality, dtype: object"
          }
        ]
      },
      "datamart_id": "127860000"
    }]'''

cached_response_baseball = '''[{
  "summary": " - SUMMARY OF THE DATAMART DATASET - * Datamart ID: 289810000 * Score: 11.323018 * Title: WIKIDATA_PROP_LEAGUE * Description: league in which team or player plays or has played in * URL: https://www.wikidata.org/wiki/Property:P118 * Columns: [0] source [1] category [2] prop_value [3] subject_label (http://www.wikidata.org/entity/Q113159, http://www.wikidata.org/entity/Q115821, http://www.wikidata.org/entity/Q86891 ...)[4] value_label (2. Fußball-Bundesliga, Bahraini Premier League, Botswana Premier League ...) * Recommend Join Columns: None        ",
  "score": 11.323018,
  "metadata": {
    "datamart_id": 289810000,
    "title": "WIKIDATA_PROP_LEAGUE",
    "description": "league in which team or player plays or has played in",
    "url": "https://www.wikidata.org/wiki/Property:P118",
    "keywords": [
      "source",
      "subject_label",
      "category",
      "prop_value",
      "value_label"
    ],
    "provenance": {
      "source": "wikidata.org"
    },
    "original_identifier": "wikidata_spo_materializer",
    "materialization": {
      "python_path": "wikidata_spo_materializer",
      "arguments": {
        "property": "P118"
      }
    },
    "variables": [
      {
        "datamart_id": 289810001,
        "name": "source",
        "description": "the entities associated with the given property"
      },
      {
        "datamart_id": 289810002,
        "name": "category",
        "description": "the categories of the entities associated with the given property"
      },
      {
        "datamart_id": 289810003,
        "name": "prop_value",
        "description": "the entities associated with the given property"
      },
      {
        "datamart_id": 289810004,
        "name": "subject_label",
        "description": "the entity label that the entities associated with the given property"
      },
      {
        "datamart_id": 289810005,
        "name": "value_label",
        "description": "the value label of the property value"
      }
    ],
    "license": {}
  },
  "datamart_id": "289810000"
}]'''
