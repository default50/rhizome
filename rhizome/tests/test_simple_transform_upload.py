from django.test import TestCase
from django.contrib.auth.models import User
from django.conf import settings
from pandas import read_csv, notnull, to_datetime

from rhizome.etl_tasks.simple_upload_transform import SimpleDocTransform
from rhizome.models import *

class TransformUploadTestCase(TestCase):

    def __init__(self, *args, **kwargs):

        super(TransformUploadTestCase, self).__init__(*args, **kwargs)

    def set_up(self):

        self.create_metadata()
        self.user = User.objects.get(username = 'test')
        self.document = Document.objects.get(doc_title = 'test')

        self.test_file_location = 'ebola_data.csv'
        self.document.docfile = self.test_file_location
        self.document.save()


        self.location_list = Location.objects.all().values_list('name',flat=True)

    def simple_transform(self):

        self.set_up()


        sdt = SimpleDocTransform(self.user.id, self.document.id)

        try:
            sdt.main()
        except Exception as err:
            self.assertEqual(err, THeCustomExcptionIWrote)

        source_submissions = dt.process_file()

        the_value_from_the_database = 1
        some_cell_value_from_the_file = 1

        self.assertEqual(some_cell_value_from_the_file, the_value_from_the_database)

    def create_metadata(self):
        '''
        Creating the Indicator, location, Campaign, meta data needed for the
        system to aggregate / caclulate.
        '''

        top_lvl_tag = IndicatorTag.objects.create(id = 1, tag_name='Polio')

        campaign_df = read_csv('rhizome/tests/_data/campaigns.csv')
        campaign_df['top_lvl_indicator_tag_id'] = top_lvl_tag.id

        campaign_df['start_date'] = to_datetime(campaign_df['start_date'])
        campaign_df['end_date'] = to_datetime(campaign_df['end_date'])

        location_df= read_csv('rhizome/tests/_data/locations.csv')
        indicator_df = read_csv('rhizome/tests/_data/indicators.csv')

        user_id = User.objects.create_user('test','test@test.com', 'test').id
        office_id = Office.objects.create(id=1,name='test').id

        cache_job_id = CacheJob.objects.create(id = -2, \
            date_attempted = '2015-01-01',is_error = False)

        document_id = Document.objects.create(
            doc_title = 'test',
            file_header = 'Campaign,Wardcode,uq_id,HHsampled,HHvisitedTEAMS,Marked0to59,UnImmun0to59,NOimmReas1,NOimmReas2,NOimmReas3,NOimmReas4,NOimmReas5,NOimmReas6,NOimmReas7,NOimmReas8,NOimmReas9,NOimmReas10,NOimmReas11,NOimmReas12,NOimmReas13,NOimmReas14,NOimmReas15,NOimmReas16,NOimmReas17,NOimmReas18,NOimmReas19,NOimmReas20,ZeroDose,TotalYoungest,YoungstRI,RAssessMrk,RCorctCAT,RIncorect,RXAssessMrk,RXCorctCAT,RXIncorect,STannounc,SRadio,STradlead,SReiliglead,SMosque,SNewspaper,SPoster,Sbanner,SRelative,SHworker,Scommmob,SNOTAWARE,Influence1,Influence2,Influence3,Influence4,Influence5,Influence6,Influence7,Influence8',
            created_by_id = user_id,
            guid = 'test').id

        campaign_type = CampaignType.objects.create(id=1,name="test")

        location_ids = self.model_df_to_data(location_df,Location)
        campaign_ids = self.model_df_to_data(campaign_df,Campaign)
        indicator_ids = self.model_df_to_data(indicator_df,Indicator)


    def model_df_to_data(self,model_df,model):

        meta_ids = []

        non_null_df = model_df.where((notnull(model_df)), None)
        list_of_dicts = non_null_df.transpose().to_dict()

        for row_ix, row_dict in list_of_dicts.iteritems():

            row_id = model.objects.create(**row_dict)
            meta_ids.append(row_id)

        return meta_ids