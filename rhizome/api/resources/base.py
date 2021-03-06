import traceback

from tastypie import http
from tastypie.resources import Resource

from tastypie.authorization import Authorization
from tastypie.authentication import ApiKeyAuthentication, MultiAuthentication
from tastypie.resources import Resource

from rhizome.api.serialize import CustomSerializer
from rhizome.api.custom_session_authentication import CustomSessionAuthentication
from rhizome.api.custom_cache import CustomCache
from rhizome.api.exceptions import DatapointsException

from rhizome.models import LocationPermission, Location, LocationTree
from django.http import HttpResponse

class BaseResource(Resource):
    '''
    '''
    class Meta:
        authentication = MultiAuthentication(CustomSessionAuthentication(), ApiKeyAuthentication())
        allowed_methods = ['get', 'post', 'patch']
        authorization = Authorization()
        always_return_data = True
        cache = CustomCache()
        serializer = CustomSerializer()

    def get_locations_to_return_from_url(self, request):
        '''
        This method is used in both the /geo and /datapoint endpoints.  Based
        on the values parsed from the URL parameters find the locations needed
        to fulfill the request based on the four rules below.

        1. location_id__in =
        2. parent_location_id__in =

        right now -- this only filters if there is no param.. i should get the
        permitted locations first then do an intersection with the params..
        '''

        try:
            location_ids = request.GET['location_id__in'].split(',')
            return location_ids
        except KeyError:
            pass

        try:
            pl_id_list = request.GET['parent_location_id__in'].split(',')

            location_ids = list(LocationTree.objects\
                        .filter(parent_location_id__in=pl_id_list)
                        .values_list('location_id',flat=True))

            ## provinces ##
            prov_and_country_ids = Location.objects\
                .filter(location_type__name__in=['Province','Country'])\
                .values_list('id',flat=True)

            ## districts ##
            dist_ids = Location.objects.filter(lpd_status__in=[1,2])\
                .values_list('id',flat=True)

            prov_country_and_district_ids = list(prov_and_country_ids) \
                + list(dist_ids)

            filtered_location_ids = list(set(location_ids)\
                .intersection(set(prov_country_and_district_ids)))

            return filtered_location_ids

        except KeyError:
            pass

        location_qs = (
            LocationTree.objects
            .filter(parent_location_id=self.top_lvl_location_id)
            .values_list('location_id', flat=True)
        )

        return location_qs


    def dispatch(self, request_type, request, **kwargs):
        """
        Overrides Tastypie and calls get_list.
        """

        try:
            self.top_lvl_location_id = LocationPermission.objects.get(
                user_id = request.user.id).top_lvl_location_id
        except LocationPermission.DoesNotExist:
            self.top_lvl_location_id = Location.objects\
                .filter(parent_location_id = None)[0].id

        allowed_methods = getattr(self._meta, "%s_allowed_methods" % request_type, None)
        #
        if 'HTTP_X_HTTP_METHOD_OVERRIDE' in request.META:
            request.method = request.META['HTTP_X_HTTP_METHOD_OVERRIDE']

        request_method = self.method_check(request, allowed=allowed_methods)
        method = getattr(self, "%s_%s" % (request_method, request_type), None)

        # if method is None:
        #     raise ImmediateHttpResponse(response=http.HttpNotImplemented())

        self.is_authenticated(request)
        self.throttle_check(request)
        # All clear. Process the request.

        # If what comes back isn't a ``HttpResponse``, assume that the
        # request was accepted and that some action occurred. This also
        # prevents Django from freaking out.

        # request = convert_post_to_put(request)

        try:
            response = method(request, **kwargs)
        except Exception as error:

            error_code = DatapointsException.defaultCode
            error_message = DatapointsException.defaultMessage

            if isinstance(error, DatapointsException):
                error_code = error.code
                error_message = error.message

            data = {
                'traceback': traceback.format_exc(),
                'error': error_message,
                'code': error_code
            }

            return self.error_response(
                request,
                data,
                response_class=http.HttpApplicationError
            )

        if not isinstance(response, HttpResponse):
            return http.HttpNoContent()

        return response
