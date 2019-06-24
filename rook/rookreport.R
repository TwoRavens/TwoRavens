
rookReport.app <- function(params, body) {

  print('test')
  body <- gsub("solaJSON=", "", body)

  if (!dir.exists(REPORT_OUTPUT_PATH))
  dir.create(REPORT_OUTPUT_PATH, recursive = TRUE)

  reportName <- paste0('report_', paste0(sample(c(0:9, LETTERS), 10, replace=TRUE), collapse=""), '.pdf')

  templatePath <- paste(getwd(), 'rookReportTemplate.Rmd', sep="/")
  releasePath <- paste(REPORT_OUTPUT_PATH, 'preprocess.json', sep="/")
  reportPath <- paste(REPORT_OUTPUT_PATH, reportName, sep="/")
  returnPath <- paste('rook-files/reports', reportName, sep="/")

  reportParams <- list(
    title="Dataset Summary",
    author="TwoRavens",
    path=releasePath
  )

  write(body, releasePath)
  rmarkdown::render(
    templatePath,
    params=reportParams,
    output_file=reportPath,
    envir = new.env() # knit in a new R session, to prevent name collisions
  )

  file.remove(releasePath)

  list(report_url=jsonlite::unbox(returnPath))
}

